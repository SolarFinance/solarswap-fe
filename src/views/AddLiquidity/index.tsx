import { useCallback, useEffect, useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { Currency, currencyEquals, ETHER, TokenAmount, WETH } from '@solarswap/sdk'
// import { useModal } from '@solarswap/uikit'
import useModal from 'components/Modal/useModal'
import { NormalButton, Icon, Row, Message, IconEnum } from '@astraprotocol/astra-ui'
import { logError } from 'utils/sentry'
import { useIsTransactionUnsupported } from 'hooks/Trades'
import { useTranslation } from 'contexts/Localization'
import UnsupportedCurrencyFooter from 'components/UnsupportedCurrencyFooter'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useDispatch } from 'react-redux'
import { useRouter } from 'next/router'
import { CHAIN_ID } from 'config/constants/networks'
import { AppDispatch } from '../../state'
import { LightCard } from '../../components/Card'
import { AutoColumn, ColumnCenter } from '../../components/Layout/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { AppHeader, AppBody } from '../../components/App'
import { MinimalPositionCard } from '../../components/PositionCard'
// import { RowBetween } from '../../components/Layout/Row'
// import ConnectWalletButton from '../../components/ConnectWalletButton'
import ButtonConnect from 'components/ButtonConnect'

import { ROUTER_ADDRESS } from '../../config/constants'
import { PairState } from '../../hooks/usePairs'
import { useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import useTransactionDeadline from '../../hooks/useTransactionDeadline'
import { Field, resetMintState } from '../../state/mint/actions'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from '../../state/mint/hooks'

import { useTransactionAdder } from '../../state/transactions/hooks'
import { useGasPrice, useIsExpertMode, useUserSlippageTolerance } from '../../state/user/hooks'
import { calculateGasMargin, calculateSlippageAmount, getRouterContract } from '../../utils'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import Dots from '../../components/Loader/Dots'
import { currencyId } from '../../utils/currencyId'
import PoolPriceBar from './PoolPriceBar'
// import Page from '../Page'
import ConfirmAddLiquidityModal from '../Swap/components/ConfirmAddLiquidityModal'
import Page from 'components/Layout/Page'
import { isUserRejected } from '../../utils/sentry'

export default function AddLiquidity() {
	const router = useRouter()
	const [currencyIdA, currencyIdB] = router.query.currency || []

	const { account, chainId, library } = useActiveWeb3React()
	const dispatch = useDispatch<AppDispatch>()
	const { t } = useTranslation()
	const gasPrice = useGasPrice()

	const currencyA = useCurrency(currencyIdA)
	const currencyB = useCurrency(currencyIdB)

	useEffect(() => {
		if (!currencyIdA && !currencyIdB) {
			dispatch(resetMintState())
		}
	}, [dispatch, currencyIdA, currencyIdB])

	const oneCurrencyIsWETH = Boolean(
		chainId &&
			((currencyA && currencyEquals(currencyA, WETH[chainId])) ||
				(currencyB && currencyEquals(currencyB, WETH[chainId]))),
	)

	const expertMode = useIsExpertMode()

	// mint state
	const { independentField, typedValue, otherTypedValue } = useMintState()
	const {
		dependentField,
		currencies,
		pair,
		pairState,
		currencyBalances,
		parsedAmounts,
		price,
		noLiquidity,
		liquidityMinted,
		poolTokenPercentage,
		error,
	} = useDerivedMintInfo(currencyA ?? undefined, currencyB ?? undefined)

	const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

	const isValid = !error

	// modal and loading
	const [{ attemptingTxn, liquidityErrorMessage, txHash }, setLiquidityState] = useState<{
		attemptingTxn: boolean
		liquidityErrorMessage: string | undefined
		txHash: string | undefined
	}>({
		attemptingTxn: false,
		liquidityErrorMessage: undefined,
		txHash: undefined,
	})

	// txn values
	const deadline = useTransactionDeadline() // custom from users settings
	const [allowedSlippage] = useUserSlippageTolerance() // custom from users

	// get formatted amounts
	const formattedAmounts = {
		[independentField]: typedValue,
		[dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
	}

	// get the max amounts user can add
	const maxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
		(accumulator, field) => {
			return {
				...accumulator,
				[field]: maxAmountSpend(currencyBalances[field]),
			}
		},
		{},
	)

	const atMaxAmounts: { [field in Field]?: TokenAmount } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
		(accumulator, field) => {
			return {
				...accumulator,
				[field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0'),
			}
		},
		{},
	)

	// check whether the user has approved the router on the tokens
	const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_A], ROUTER_ADDRESS[CHAIN_ID])
	const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[Field.CURRENCY_B], ROUTER_ADDRESS[CHAIN_ID])

	const addTransaction = useTransactionAdder()

	async function onAdd() {
		if (!chainId || !library || !account) return
		const routerContract = getRouterContract(chainId, library, account)

		const { [Field.CURRENCY_A]: parsedAmountA, [Field.CURRENCY_B]: parsedAmountB } = parsedAmounts
		if (!parsedAmountA || !parsedAmountB || !currencyA || !currencyB || !deadline) {
			return
		}

		const amountsMin = {
			[Field.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? 0 : allowedSlippage)[0],
			[Field.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? 0 : allowedSlippage)[0],
		}

		let estimate
		let method: (...args: any) => Promise<TransactionResponse>
		let args: Array<string | string[] | number>
		let value: BigNumber | null
		if (currencyA === ETHER || currencyB === ETHER) {
			const tokenBIsETH = currencyB === ETHER
			estimate = routerContract.estimateGas.addLiquidityETH
			method = routerContract.addLiquidityETH
			args = [
				wrappedCurrency(tokenBIsETH ? currencyA : currencyB, chainId)?.address ?? '', // token
				(tokenBIsETH ? parsedAmountA : parsedAmountB).raw.toString(), // token desired
				amountsMin[tokenBIsETH ? Field.CURRENCY_A : Field.CURRENCY_B].toString(), // token min
				amountsMin[tokenBIsETH ? Field.CURRENCY_B : Field.CURRENCY_A].toString(), // eth min
				account,
				deadline.toHexString(),
			]
			value = BigNumber.from((tokenBIsETH ? parsedAmountB : parsedAmountA).raw.toString())
		} else {
			estimate = routerContract.estimateGas.addLiquidity
			method = routerContract.addLiquidity
			args = [
				wrappedCurrency(currencyA, chainId)?.address ?? '',
				wrappedCurrency(currencyB, chainId)?.address ?? '',
				parsedAmountA.raw.toString(),
				parsedAmountB.raw.toString(),
				amountsMin[Field.CURRENCY_A].toString(),
				amountsMin[Field.CURRENCY_B].toString(),
				account,
				deadline.toHexString(),
			]
			value = null
		}

		setLiquidityState({ attemptingTxn: true, liquidityErrorMessage: undefined, txHash: undefined })
		await estimate(...args, value ? { value } : {})
			.then(estimatedGasLimit =>
				method(...args, {
					...(value ? { value } : {}),
					gasLimit: calculateGasMargin(estimatedGasLimit),
					gasPrice,
				}).then(response => {
					setLiquidityState({ attemptingTxn: false, liquidityErrorMessage: undefined, txHash: response.hash })

					addTransaction(response, {
						summary: `Add ${parsedAmounts[Field.CURRENCY_A]?.toSignificant(3)} ${
							currencies[Field.CURRENCY_A]?.symbol
						} and ${parsedAmounts[Field.CURRENCY_B]?.toSignificant(3)} ${
							currencies[Field.CURRENCY_B]?.symbol
						}`,
					})
				}),
			)
			.catch(err => {
				if (!isUserRejected(err)) {
					console.log(`Add Liquidity failed`, err, args, value)
					logError(err)
				}
				setLiquidityState({
					attemptingTxn: false,
					liquidityErrorMessage: !isUserRejected(err)
						? err?.code === -32603
							? t(`Add Liquidity failed: %message%`, {
									message: t(
										`Insufficient fee. Please increase the priority tip (for EIP-1559 txs) or the gas prices (for access list or legacy txs)`,
									),
							  })
							: t(`Add Liquidity failed: %message%`, { message: err.message })
						: t(`Add Liquidity failed: %message%`, { message: t('User denied message signature.') }),
					txHash: undefined,
				})
			})
	}

	const pendingText = t('Supplying %amountA% %symbolA% and %amountB% %symbolB%', {
		amountA: parsedAmounts[Field.CURRENCY_A]?.toSignificant(6) ?? '',
		symbolA: currencies[Field.CURRENCY_A]?.symbol ?? '',
		amountB: parsedAmounts[Field.CURRENCY_B]?.toSignificant(6) ?? '',
		symbolB: currencies[Field.CURRENCY_B]?.symbol ?? '',
	})

	const handleCurrencyASelect = useCallback(
		(currencyA_: Currency) => {
			const newCurrencyIdA = currencyId(currencyA_)
			if (newCurrencyIdA === currencyIdB) {
				router.replace(`/add/${currencyIdB}/${currencyIdA}`, undefined, { shallow: true })
			} else if (currencyIdB) {
				router.replace(`/add/${newCurrencyIdA}/${currencyIdB}`, undefined, { shallow: true })
			} else {
				router.replace(`/add/${newCurrencyIdA}`, undefined, { shallow: true })
			}
		},
		[currencyIdB, router, currencyIdA],
	)
	const handleCurrencyBSelect = useCallback(
		(currencyB_: Currency) => {
			const newCurrencyIdB = currencyId(currencyB_)
			if (currencyIdA === newCurrencyIdB) {
				if (currencyIdB) {
					router.replace(`/add/${currencyIdB}/${newCurrencyIdB}`, undefined, { shallow: true })
				} else {
					router.replace(`/add/${newCurrencyIdB}`, undefined, { shallow: true })
				}
			} else {
				router.replace(`/add/${currencyIdA || 'ASA'}/${newCurrencyIdB}`, undefined, { shallow: true })
			}
		},
		[currencyIdA, router, currencyIdB],
	)

	const handleDismissConfirmation = useCallback(() => {
		// if there was a tx hash, we want to clear the input
		if (txHash) {
			onFieldAInput('')
		}
	}, [onFieldAInput, txHash])

	const addIsUnsupported = useIsTransactionUnsupported(currencies?.CURRENCY_A, currencies?.CURRENCY_B)

	const [onPresentAddLiquidityModal] = useModal(
		<ConfirmAddLiquidityModal
			title={noLiquidity ? t('You are creating a pool') : t('You will receive')}
			customOnDismiss={handleDismissConfirmation}
			attemptingTxn={attemptingTxn}
			hash={txHash}
			pendingText={pendingText}
			currencyToAdd={pair?.liquidityToken}
			allowedSlippage={allowedSlippage}
			onAdd={onAdd}
			parsedAmounts={parsedAmounts}
			currencies={currencies}
			liquidityErrorMessage={liquidityErrorMessage}
			price={price}
			noLiquidity={noLiquidity}
			poolTokenPercentage={poolTokenPercentage}
			liquidityMinted={liquidityMinted}
		/>,
		true,
		true,
		'addLiquidityModal',
	)

	return (
		<Page>
			<div className="flex col block-center">
				<AppBody className="border border-base radius-lg">
					<AppHeader
						title={t('Add Liquidity')}
						subtitle={t('Add liquidity to receive LP tokens')}
						helper={t(
							'Liquidity providers earn a 0.2% trading fee on all trades made for that token pair, proportional to their share of the liquidity pool.',
						)}
						backTo="/liquidity"
					/>
					<div className="padding-top-md padding-bottom-md padding-right-sm">
						<div className="flex col padding-xs">
							{noLiquidity && (
								<ColumnCenter>
									<Message variant="warning">
										<div>
											<span className="text margin-bottom-xs text-bold">
												{t('You are the first liquidity provider.')}
											</span>
											<span className="text margin-bottom-xs">
												{t('The ratio of tokens you add will set the price of this pool.')}
											</span>
											<span className="text">
												{t('Once you are happy with the rate click supply to review.')}
											</span>
										</div>
									</Message>
								</ColumnCenter>
							)}
							<CurrencyInputPanel
								value={formattedAmounts[Field.CURRENCY_A]}
								onUserInput={onFieldAInput}
								onMax={() => {
									onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
								}}
								onCurrencySelect={handleCurrencyASelect}
								showMaxButton={!atMaxAmounts[Field.CURRENCY_A]}
								currency={currencies[Field.CURRENCY_A]}
								id="add-liquidity-input-tokena"
								showCommonBases
							/>
							<ColumnCenter>
								<Icon icon={IconEnum.ICON_PLUS} />
							</ColumnCenter>
							<CurrencyInputPanel
								value={formattedAmounts[Field.CURRENCY_B]}
								onUserInput={onFieldBInput}
								onCurrencySelect={handleCurrencyBSelect}
								onMax={() => {
									onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
								}}
								showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
								currency={currencies[Field.CURRENCY_B]}
								id="add-liquidity-input-tokenb"
								showCommonBases
							/>
							{currencies[Field.CURRENCY_A] &&
								currencies[Field.CURRENCY_B] &&
								pairState !== PairState.INVALID && (
									<>
										<div className="border border-base radius-lg margin-bottom-xl margin-left-sm">
											<div className="padding-md">
												<span className="text text-sm text-bold">
													{noLiquidity
														? t('Initial prices and pool share')
														: t('Prices and pool share')}
													:{' '}
												</span>
											</div>{' '}
											<div className="border border-base radius-lg">
												<PoolPriceBar
													currencies={currencies}
													poolTokenPercentage={poolTokenPercentage}
													noLiquidity={noLiquidity}
													price={price}
												/>
											</div>
										</div>
									</>
								)}

							{addIsUnsupported ? (
								<NormalButton
									classes={{ other: 'width-100 text-base padding-left-sm margin-bottom-2xs' }}
									disabled
								>
									{t('Unsupported Asset')}
								</NormalButton>
							) : !account ? (
								<ButtonConnect />
							) : (
								<div className="flex col padding-left-sm">
									{(approvalA === ApprovalState.NOT_APPROVED ||
										approvalA === ApprovalState.PENDING ||
										approvalB === ApprovalState.NOT_APPROVED ||
										approvalB === ApprovalState.PENDING) &&
										isValid && (
											<Row className="flex-justify-space-between padding-bottom-md">
												{approvalA !== ApprovalState.APPROVED && (
													<NormalButton
														classes={{ other: 'width-100 text-base' }}
														onClick={approveACallback}
														disabled={approvalA === ApprovalState.PENDING}
														style={{
															width:
																approvalB !== ApprovalState.APPROVED ? '48%' : '100%',
														}}
													>
														{approvalA === ApprovalState.PENDING ? (
															<Dots>
																{t('Enabling %asset%', {
																	asset: currencies[Field.CURRENCY_A]?.symbol,
																})}
															</Dots>
														) : (
															t('Enable %asset%', {
																asset: currencies[Field.CURRENCY_A]?.symbol,
															})
														)}
													</NormalButton>
												)}
												{approvalB !== ApprovalState.APPROVED && (
													<NormalButton
														classes={{ other: 'width-100 text-base' }}
														onClick={approveBCallback}
														disabled={approvalB === ApprovalState.PENDING}
														style={{
															width:
																approvalA !== ApprovalState.APPROVED ? '48%' : '100%',
														}}
													>
														{approvalB === ApprovalState.PENDING ? (
															<Dots>
																{t('Enabling %asset%', {
																	asset: currencies[Field.CURRENCY_B]?.symbol,
																})}
															</Dots>
														) : (
															t('Enable %asset%', {
																asset: currencies[Field.CURRENCY_B]?.symbol,
															})
														)}
													</NormalButton>
												)}
											</Row>
										)}
									<NormalButton
										classes={{ other: 'width-100 text-base' }}
										variant={
											!isValid &&
											!!parsedAmounts[Field.CURRENCY_A] &&
											!!parsedAmounts[Field.CURRENCY_B]
												? 'default'
												: 'primary'
										}
										onClick={() => {
											if (expertMode) {
												onAdd()
											} else {
												setLiquidityState({
													attemptingTxn: false,
													liquidityErrorMessage: undefined,
													txHash: undefined,
												})
												onPresentAddLiquidityModal()
											}
										}}
										disabled={
											!isValid ||
											approvalA !== ApprovalState.APPROVED ||
											approvalB !== ApprovalState.APPROVED
										}
									>
										{error ?? t('Supply')}
									</NormalButton>
								</div>
							)}
						</div>
					</div>
				</AppBody>
				{!addIsUnsupported ? (
					pair && !noLiquidity && pairState !== PairState.INVALID ? (
						<MinimalPositionCard showUnwrapped={oneCurrencyIsWETH} pair={pair} />
					) : null
				) : (
					<UnsupportedCurrencyFooter currencies={[currencies.CURRENCY_A, currencies.CURRENCY_B]} />
				)}
			</div>
		</Page>
	)
}
