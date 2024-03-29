import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { CurrencyAmount, JSBI, Token, Trade } from '@solarswap/sdk'

import { useIsTransactionUnsupported } from 'hooks/Trades'
import clsx from 'clsx'
import UnsupportedCurrencyFooter from 'components/UnsupportedCurrencyFooter'
// import Footer from 'components/Menu/Footer'
import { useRouter } from 'next/router'
import { useTranslation } from 'contexts/Localization'
import { EXCHANGE_DOCS_URLS } from 'config/constants'
import SwapWarningTokens from 'config/constants/swapWarningTokens'
import useRefreshBlockNumberID from './hooks/useRefreshBlockNumber'
import AddressInputPanel from './components/AddressInputPanel'
// import { GreyCard } from '../../components/Card'
// import Column, { AutoColumn } from '../../components/Layout/Column'
import ConfirmSwapModal from './components/ConfirmSwapModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
// import { AutoRow, RowBetween } from '../../components/Layout/Row'
import AdvancedSwapDetailsDropdown from './components/AdvancedSwapDetailsDropdown'
import confirmPriceImpactWithoutFee from './components/confirmPriceImpactWithoutFee'
import TradePrice from './components/TradePrice'
import ImportTokenWarningModal from './components/ImportTokenWarningModal'
import ProgressSteps from './components/ProgressSteps'
// import { AppBody } from '../../components/App'
// import ConnectWalletButton from '../../components/ConnectWalletButton'

import useActiveWeb3React from '../../hooks/useActiveWeb3React'
import { useCurrency, useAllTokens } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import { useSwapCallback } from '../../hooks/useSwapCallback'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'
import { Field } from '../../state/swap/actions'
import {
	useDefaultsFromURLSearch,
	useDerivedSwapInfo,
	useSwapActionHandlers,
	useSwapState,
	useSingleTokenSwapInfo,
} from '../../state/swap/hooks'
import {
	useExpertModeManager,
	useUserSlippageTolerance,
	useUserSingleHopOnly,
	useExchangeChartManager,
} from '../../state/user/hooks'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { computeTradePriceBreakdown, warningSeverity } from '../../utils/prices'
// import CircleLoader from '../../components/Loader/CircleLoader'
// // import Page from '../Page'
import SwapWarningModal from './components/SwapWarningModal'
import PriceChartContainer from './components/Chart/PriceChartContainer'
// import { StyledInputCurrencyWrapper, StyledSwapContainer } from './styles'
import CurrencyInputHeader from './components/CurrencyInputHeader'
import { Container, Icon, IconButton, IconEnum, NormalButton, Row, Tag, useMobileLayout } from '@astraprotocol/astra-ui'
import { useModal } from 'components/Modal'
import { BottomDrawer } from 'components/BottomDrawer'
import Page from 'components/Layout/Page'
import styles from '../../views/Swap/styles.module.scss'
import { AppBody } from 'components/App'
import useMatchBreakpoints from 'hooks/useMatchBreakpoints'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import ButtonConnect from 'components/ButtonConnect'
import CircleLoader from 'components/Loader/CircleLoader'
import { SwapCallbackError } from './components/SwapCallbackError'

export default function Swap() {
	const router = useRouter()
	const loadedUrlParams = useDefaultsFromURLSearch()
	const { t } = useTranslation()
	const { isMobile } = useMatchBreakpoints()
	const [isChartExpanded, setIsChartExpanded] = useState(false)
	const [userChartPreference, setUserChartPreference] = useExchangeChartManager(isMobile)
	const [isChartDisplayed, setIsChartDisplayed] = useState(userChartPreference)
	const { refreshBlockNumber, isLoading } = useRefreshBlockNumberID()

	useEffect(() => {
		setUserChartPreference(isChartDisplayed)
	}, [isChartDisplayed, setUserChartPreference])

	// token warning stuff
	const [loadedInputCurrency, loadedOutputCurrency] = [
		useCurrency(loadedUrlParams?.inputCurrencyId),
		useCurrency(loadedUrlParams?.outputCurrencyId),
	]
	const urlLoadedTokens: Token[] = useMemo(
		() => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
		[loadedInputCurrency, loadedOutputCurrency],
	)

	// dismiss warning if all imported tokens are in active lists
	const defaultTokens = useAllTokens()
	const importTokensNotInDefault =
		urlLoadedTokens &&
		urlLoadedTokens.filter((token: Token) => {
			return !(token.address in defaultTokens)
		})

	const { account } = useActiveWeb3React()

	// for expert mode
	const [isExpertMode] = useExpertModeManager()

	// get custom setting values for user
	const [allowedSlippage] = useUserSlippageTolerance()

	// swap state & price data
	const {
		independentField,
		typedValue,
		recipient,
		[Field.INPUT]: { currencyId: inputCurrencyId },
		[Field.OUTPUT]: { currencyId: outputCurrencyId },
	} = useSwapState()
	const inputCurrency = useCurrency(inputCurrencyId)
	const outputCurrency = useCurrency(outputCurrencyId)
	const {
		v2Trade,
		currencyBalances,
		parsedAmount,
		currencies,
		inputError: swapInputError,
	} = useDerivedSwapInfo(
		independentField,
		typedValue,
		inputCurrencyId,
		inputCurrency,
		outputCurrencyId,
		outputCurrency,
		recipient,
	)

	const {
		wrapType,
		execute: onWrap,
		inputError: wrapInputError,
	} = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
	const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
	const trade = showWrap ? undefined : v2Trade

	const singleTokenPrice = useSingleTokenSwapInfo(inputCurrencyId, inputCurrency, outputCurrencyId, outputCurrency)

	const parsedAmounts = showWrap
		? {
				[Field.INPUT]: parsedAmount,
				[Field.OUTPUT]: parsedAmount,
		  }
		: {
				[Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
				[Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
		  }

	const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
	const isValid = !swapInputError
	const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

	const handleTypeInput = useCallback(
		(value: string) => {
			onUserInput(Field.INPUT, value)
		},
		[onUserInput],
	)
	const handleTypeOutput = useCallback(
		(value: string) => {
			onUserInput(Field.OUTPUT, value)
		},
		[onUserInput],
	)

	// modal and loading
	const [{ tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
		tradeToConfirm: Trade | undefined
		attemptingTxn: boolean
		swapErrorMessage: string | undefined
		txHash: string | undefined
	}>({
		tradeToConfirm: undefined,
		attemptingTxn: false,
		swapErrorMessage: undefined,
		txHash: undefined,
	})

	const formattedAmounts = {
		[independentField]: typedValue,
		[dependentField]: showWrap
			? parsedAmounts[independentField]?.toExact() ?? ''
			: parsedAmounts[dependentField]?.toSignificant(6) ?? '',
	}

	const route = trade?.route
	const userHasSpecifiedInputOutput = Boolean(
		currencies[Field.INPUT] &&
			currencies[Field.OUTPUT] &&
			parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0)),
	)
	const noRoute = !route

	// check whether the user has approved the router on the input token
	const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)

	// check if user has gone through approval process, used to show two step buttons, reset on token change
	const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

	// mark when a user has submitted an approval, reset onTokenSelection for input field
	useEffect(() => {
		if (approval === ApprovalState.PENDING) {
			setApprovalSubmitted(true)
		}
	}, [approval, approvalSubmitted])

	const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
	const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

	// the callback to execute the swap
	const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(trade, allowedSlippage, recipient)

	const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)

	const [singleHopOnly] = useUserSingleHopOnly()

	const handleSwap = useCallback(() => {
		if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee, t)) {
			return
		}
		if (!swapCallback) {
			return
		}
		setSwapState({ attemptingTxn: true, tradeToConfirm, swapErrorMessage: undefined, txHash: undefined })
		swapCallback()
			.then(hash => {
				setSwapState({ attemptingTxn: false, tradeToConfirm, swapErrorMessage: undefined, txHash: hash })
			})
			.catch(error => {
				setSwapState({
					attemptingTxn: false,
					tradeToConfirm,
					swapErrorMessage: error.message,
					txHash: undefined,
				})
			})
	}, [priceImpactWithoutFee, swapCallback, tradeToConfirm, t])

	// errors
	const [showInverted, setShowInverted] = useState<boolean>(false)

	// warnings on slippage
	const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

	// show approve flow when: no error on inputs, not approved or pending, or approved in current session
	// never show if price impact is above threshold in non expert mode
	const showApproveFlow =
		!swapInputError &&
		(approval === ApprovalState.NOT_APPROVED ||
			approval === ApprovalState.PENDING ||
			(approvalSubmitted && approval === ApprovalState.APPROVED)) &&
		!(priceImpactSeverity > 3 && !isExpertMode)

	const handleConfirmDismiss = useCallback(() => {
		setSwapState({ tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
		// if there was a tx hash, we want to clear the input
		if (txHash) {
			onUserInput(Field.INPUT, '')
		}
	}, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

	const handleAcceptChanges = useCallback(() => {
		setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn })
	}, [attemptingTxn, swapErrorMessage, trade, txHash])

	// swap warning state
	const [swapWarningCurrency, setSwapWarningCurrency] = useState(null)
	const [onPresentSwapWarningModal] = useModal(<SwapWarningModal swapCurrency={swapWarningCurrency} />)

	const shouldShowSwapWarning = swapCurrency => {
		const isWarningToken = Object.entries(SwapWarningTokens).find(warningTokenConfig => {
			const warningTokenData = warningTokenConfig[1]
			return swapCurrency.address === warningTokenData.address
		})
		return Boolean(isWarningToken)
	}

	useEffect(() => {
		if (swapWarningCurrency) {
			onPresentSwapWarningModal()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [swapWarningCurrency])

	const handleInputSelect = useCallback(
		currencyInput => {
			setApprovalSubmitted(false) // reset 2 step UI for approvals
			onCurrencySelection(Field.INPUT, currencyInput)
			const showSwapWarning = shouldShowSwapWarning(currencyInput)
			if (showSwapWarning) {
				setSwapWarningCurrency(currencyInput)
			} else {
				setSwapWarningCurrency(null)
			}
		},
		[onCurrencySelection],
	)

	const handleMaxInput = useCallback(() => {
		if (maxAmountInput) {
			onUserInput(Field.INPUT, maxAmountInput.toExact())
		}
	}, [maxAmountInput, onUserInput])

	const handleOutputSelect = useCallback(
		currencyOutput => {
			onCurrencySelection(Field.OUTPUT, currencyOutput)
			const showSwapWarning = shouldShowSwapWarning(currencyOutput)
			if (showSwapWarning) {
				setSwapWarningCurrency(currencyOutput)
			} else {
				setSwapWarningCurrency(null)
			}
		},

		[onCurrencySelection],
	)

	const swapIsUnsupported = useIsTransactionUnsupported(currencies?.INPUT, currencies?.OUTPUT)

	const [onPresentImportTokenWarningModal] = useModal(
		<ImportTokenWarningModal tokens={importTokensNotInDefault} onCancel={() => router.push('/swap')} />,
	)

	useEffect(() => {
		if (importTokensNotInDefault.length > 0) {
			onPresentImportTokenWarningModal()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [importTokensNotInDefault.length])

	const [onPresentConfirmModal] = useModal(
		<ConfirmSwapModal
			trade={trade}
			originalTrade={tradeToConfirm}
			onAcceptChanges={handleAcceptChanges}
			attemptingTxn={attemptingTxn}
			txHash={txHash}
			recipient={recipient}
			allowedSlippage={allowedSlippage}
			onConfirm={handleSwap}
			swapErrorMessage={swapErrorMessage}
			customOnDismiss={handleConfirmDismiss}
		/>,
		true,
		true,
		'confirmSwapModal',
	)

	const hasAmount = Boolean(parsedAmount)

	const onRefreshPrice = useCallback(() => {
		if (hasAmount) {
			refreshBlockNumber()
		}
	}, [hasAmount, refreshBlockNumber])

	return (
		<Page>
			<div className="flex flex-justify-center">
				{!isMobile && (
					<PriceChartContainer
						inputCurrencyId={inputCurrencyId}
						inputCurrency={currencies[Field.INPUT]}
						outputCurrencyId={outputCurrencyId}
						outputCurrency={currencies[Field.OUTPUT]}
						isChartExpanded={isChartExpanded}
						setIsChartExpanded={setIsChartExpanded}
						isChartDisplayed={isChartDisplayed}
						currentSwapPrice={singleTokenPrice}
					/>
				)}
				<BottomDrawer
					content={
						<PriceChartContainer
							inputCurrencyId={inputCurrencyId}
							inputCurrency={currencies[Field.INPUT]}
							outputCurrencyId={outputCurrencyId}
							outputCurrency={currencies[Field.OUTPUT]}
							isChartExpanded={isChartExpanded}
							setIsChartExpanded={setIsChartExpanded}
							isChartDisplayed={isChartDisplayed}
							currentSwapPrice={singleTokenPrice}
							isMobile
						/>
					}
					isOpen={isChartDisplayed}
					setIsOpen={setIsChartDisplayed}
				/>
				<div className="flex col">
					<div className={styles.swapContainer} style={{ alignSelf: isChartDisplayed ? 'auto' : 'center' }}>
						<div className={styles.inputCurrencyWrapper}>
							<AppBody className="border border-base radius-lg">
								<CurrencyInputHeader
									title={t('Swap')}
									subtitle={t('Trade tokens in an instant')}
									setIsChartDisplayed={setIsChartDisplayed}
									isChartDisplayed={isChartDisplayed}
									hasAmount={hasAmount}
									onRefreshPrice={onRefreshPrice}
								/>
								<div id="swap-page" className=" padding-right-sm" style={{ minHeight: '412px' }}>
									<div className="flex col">
										<CurrencyInputPanel
											label={
												independentField === Field.OUTPUT && !showWrap && trade
													? t('From (estimated)')
													: t('From')
											}
											value={formattedAmounts[Field.INPUT]}
											showMaxButton={!atMaxAmountInput}
											currency={currencies[Field.INPUT]}
											onUserInput={handleTypeInput}
											onMax={handleMaxInput}
											onCurrencySelect={handleInputSelect}
											otherCurrency={currencies[Field.OUTPUT]}
											id="swap-currency-input"
										/>

										<div className="flex col flex-justify-space-between">
											<div
												className={clsx('flex col flex-align-center')}
												style={{ padding: '0 1rem' }}
											>
												<div
													onClick={() => {
														setApprovalSubmitted(false) // reset 2 step UI for approvals
														onSwitchTokens()
													}}
													className={clsx(
														styles.switchIconButton,
														'link block-hor-center contrast-bg-color-10 padding-xs border radius-sm',
													)}
												>
													<Icon icon={IconEnum.ICON_DOWN} classes={styles.iconDown} />
													<Icon
														icon={IconEnum.ICON_SWAP_TOP_DOWN}
														classes={styles.iconUpDown}
													/>
												</div>

												{recipient === null && !showWrap && isExpertMode ? (
													<NormalButton
														variant="text"
														id="add-recipient-button"
														classes={{
															color: 'secondary-color-normal',
															other: 'text text-sm',
														}}
														onClick={() => onChangeRecipient('')}
													>
														{t('+ Add a send (optional)')}
													</NormalButton>
												) : null}
											</div>
										</div>
										<CurrencyInputPanel
											value={formattedAmounts[Field.OUTPUT]}
											onUserInput={handleTypeOutput}
											label={
												independentField === Field.INPUT && !showWrap && trade
													? t('To (estimated)')
													: t('To')
											}
											showMaxButton={false}
											currency={currencies[Field.OUTPUT]}
											onCurrencySelect={handleOutputSelect}
											otherCurrency={currencies[Field.INPUT]}
											id="swap-currency-output"
										/>

										{isExpertMode && recipient !== null && !showWrap ? (
											<div className="margin-bottom-md">
												<Row
													style={{
														padding: '0 2rem',
														alignItems: 'center',
													}}
												>
													<Icon icon={IconEnum.ICON_DOWN} />
													<NormalButton
														classes={{
															color: 'secondary-color-normal',
															other: 'text text-sm',
														}}
														variant="text"
														id="remove-recipient-button"
														onClick={() => onChangeRecipient(null)}
													>
														{t('- Remove send')}
													</NormalButton>
												</Row>
												<AddressInputPanel
													id="recipient"
													value={recipient}
													onChange={onChangeRecipient}
												/>
											</div>
										) : null}

										{showWrap ? null : (
											<div className="flex col margin-left-xl">
												<Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
													{Boolean(trade) && (
														<>
															<span className="text text-sm contrast-color-70">
																{t('Price')}
															</span>
															{isLoading ? (
																<Skeleton height={24} width={128} baseColor="#312e39" />
															) : (
																<TradePrice
																	price={trade?.executionPrice}
																	showInverted={showInverted}
																	setShowInverted={setShowInverted}
																/>
															)}
														</>
													)}
												</Row>
												<Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
													<span className="text text-sm contrast-color-70">
														{t('Slippage Tolerance')}
													</span>
													<span className="text text-base">{allowedSlippage / 100}%</span>
												</Row>
											</div>
										)}
									</div>
									<div className="margin-top-md margin-bottom-md margin-left-sm">
										{swapIsUnsupported ? (
											<NormalButton classes={{ other: 'width-100 text-base' }} disabled>
												{t('Unsupported Asset')}
											</NormalButton>
										) : !account ? (
											<ButtonConnect classes="width-100" />
										) : showWrap ? (
											<NormalButton
												classes={{ other: 'width-100 text-base' }}
												disabled={Boolean(wrapInputError)}
												onClick={onWrap}
											>
												{wrapInputError ??
													(wrapType === WrapType.WRAP
														? t('Wrap')
														: wrapType === WrapType.UNWRAP
														? t('Unwrap')
														: null)}
											</NormalButton>
										) : noRoute && userHasSpecifiedInputOutput ? (
											// <GreyCard style={{ textAlign: 'center', padding: '0.75rem' }}>
											<div className="text-center">
												<span className="text text-sm alert-color-error">
													{t('Insufficient liquidity for this trade.')}
												</span>
												{singleHopOnly && (
													<span className="text text-sm alert-color-error">
														{t('Try enabling multi-hop trades.')}
													</span>
												)}
											</div>
										) : //  </GreyCard>
										showApproveFlow ? (
											<Row style={{ justifyContent: 'space-between' }}>
												<NormalButton
													variant={
														approval === ApprovalState.APPROVED ? 'primary' : 'default'
													}
													onClick={approveCallback}
													disabled={
														approval !== ApprovalState.NOT_APPROVED || approvalSubmitted
													}
													classes={{ other: 'width-100 text-base' }}
													// width="48%"
												>
													{approval === ApprovalState.PENDING ? (
														<Row style={{ justifyContent: 'center' }}>
															{t('Enabling')} <CircleLoader stroke="white" />
														</Row>
													) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
														t('Enabled')
													) : (
														t('Enable %asset%', {
															asset: currencies[Field.INPUT]?.symbol ?? '',
														})
													)}
												</NormalButton>
												<NormalButton
													variant={isValid && priceImpactSeverity > 2 ? 'default' : 'primary'}
													onClick={() => {
														if (isExpertMode) {
															handleSwap()
														} else {
															setSwapState({
																tradeToConfirm: trade,
																attemptingTxn: false,
																swapErrorMessage: undefined,
																txHash: undefined,
															})
															onPresentConfirmModal()
														}
													}}
													// width="48%"
													classes={{ other: 'width-100 text-base' }}
													id="swap-button"
													disabled={
														!isValid ||
														approval !== ApprovalState.APPROVED ||
														(priceImpactSeverity > 3 && !isExpertMode)
													}
												>
													{priceImpactSeverity > 3 && !isExpertMode
														? t('Price Impact High')
														: priceImpactSeverity > 2
														? t('Swap Anyway')
														: t('Swap')}
												</NormalButton>
											</Row>
										) : (
											<NormalButton
												variant={
													isValid && priceImpactSeverity > 2 && !swapCallbackError
														? 'default'
														: 'primary'
												}
												onClick={() => {
													if (isExpertMode) {
														handleSwap()
													} else {
														setSwapState({
															tradeToConfirm: trade,
															attemptingTxn: false,
															swapErrorMessage: undefined,
															txHash: undefined,
														})
														onPresentConfirmModal()
													}
												}}
												classes={{ other: 'width-100 text-base' }}
												id="swap-button"
												// width="100%"
												disabled={
													!isValid ||
													(priceImpactSeverity > 3 && !isExpertMode) ||
													!!swapCallbackError
												}
											>
												{swapInputError ||
													(priceImpactSeverity > 3 && !isExpertMode
														? t('Price Impact Too High')
														: priceImpactSeverity > 2
														? t('Swap Anyway')
														: t('Swap'))}
											</NormalButton>
										)}
										{showApproveFlow && (
											<div className="flex col" style={{ marginTop: '1rem' }}>
												<ProgressSteps steps={[approval === ApprovalState.APPROVED]} />
											</div>
										)}
										{isExpertMode && swapErrorMessage ? (
											<SwapCallbackError error={swapErrorMessage} />
										) : null}
									</div>
								</div>
							</AppBody>
							{!swapIsUnsupported ? (
								trade && <AdvancedSwapDetailsDropdown trade={trade} />
							) : (
								<UnsupportedCurrencyFooter currencies={[currencies.INPUT, currencies.OUTPUT]} />
							)}
						</div>
					</div>
					{/* {isChartExpanded && (
						<Box display={['none', null, null, 'block']} width="100%" height="100%">
							<Footer variant="side" helpUrl={EXCHANGE_DOCS_URLS} />
						</Box>
					)} */}
				</div>
			</div>
		</Page>
	)
}
