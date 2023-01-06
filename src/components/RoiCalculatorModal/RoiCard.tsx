import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'contexts/Localization'
import { CalculatorMode, RoiCalculatorReducerState } from './useRoiCalculatorReducer'
import styles from './styles.module.scss'
import { Form, IconButton, IconEnum } from '@astraprotocol/astra-ui'
import clsx from 'clsx'

const MILLION = 1000000
const TRILLION = 1000000000000

// const RoiCardWrapper = styled(Box)`
// 	background: linear-gradient(180deg, #53dee9, #7645d9);
// 	padding: 1px;
// 	width: 100%;
// 	border-radius: ${({ theme }) => theme.radii.default};
// `

// const RoiCardInner = styled(Box)`
// 	height: 120px;
// 	padding: 24px;
// 	border-radius: ${({ theme }) => theme.radii.default};
// 	background: ${({ theme }) => theme.colors.gradients.bubblegum};
// `

// const RoiInputContainer = styled(Box)`
// 	position: relative;
// 	& > input {
// 		padding-left: 28px;
// 		max-width: 70%;
// 	}
// 	&:before {
// 		position: absolute;
// 		content: '$';
// 		color: ${({ theme }) => theme.colors.textSubtle};
// 		left: 16px;
// 		top: 8px;
// 	}
// `

// const RoiDisplayContainer = styled(Flex)`
// 	max-width: 82%;
// 	margin-right: 8px;
// `

// const RoiDollarAmount = styled(Text)<{ fadeOut: boolean }>`
// 	position: relative;
// 	overflow-x: auto;
// 	&::-webkit-scrollbar {
// 		height: 0px;
// 	}

// 	${({ fadeOut, theme }) =>
// 		fadeOut &&
// 		`
//       &:after {
//         background: linear-gradient(
//           to right,
//           ${theme.colors.background}00,
//           ${theme.colors.background}E6
//         );
//         content: '';
//         height: 100%;
//         pointer-events: none;
//         position: absolute;
//         right: 0;
//         top: 0;
//         width: 40px;
//       }
//   `}
// `

interface RoiCardProps {
	earningTokenSymbol: string
	calculatorState: RoiCalculatorReducerState
	setTargetRoi: (amount: string) => void
	setCalculatorMode: (mode: CalculatorMode) => void
}

const RoiCard: React.FC<RoiCardProps> = ({ earningTokenSymbol, calculatorState, setTargetRoi, setCalculatorMode }) => {
	const [expectedRoi, setExpectedRoi] = useState('')
	const inputRef = useRef<HTMLInputElement | null>(null)
	const { roiUSD, roiTokens, roiPercentage } = calculatorState.data
	const { mode } = calculatorState.controls

	const { t } = useTranslation()

	useEffect(() => {
		if (mode === CalculatorMode.PRINCIPAL_BASED_ON_ROI && inputRef.current) {
			inputRef.current.focus()
		}
	}, [mode])

	const onEnterEditing = () => {
		setCalculatorMode(CalculatorMode.PRINCIPAL_BASED_ON_ROI)
		setExpectedRoi(
			roiUSD.toLocaleString('en', {
				minimumFractionDigits: roiUSD > MILLION ? 0 : 2,
				maximumFractionDigits: roiUSD > MILLION ? 0 : 2
			})
		)
	}

	const onExitRoiEditing = () => {
		setCalculatorMode(CalculatorMode.ROI_BASED_ON_PRINCIPAL)
	}
	const handleExpectedRoiChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.currentTarget.validity.valid) {
			const roiAsString = event.target.value.replace(/,/g, '.')
			setTargetRoi(roiAsString)
			setExpectedRoi(roiAsString)
		}
	}
	return (
		<div className={styles.roiCardWrapper}>
			<div className={styles.roiCardInner}>
				<span className="text text-uppercase text-bold text-xs contrast-color-70">
					{t('ROI at current rates')}
				</span>
				<div className="flex flex-justify-space-between margin-top-xs" style={{ height: 36 }}>
					{mode === CalculatorMode.PRINCIPAL_BASED_ON_ROI ? (
						<>
							<div className={styles.roiInputContainer}>
								<Form.Input
									ref={inputRef}
									type="text"
									inputMode="decimal"
									pattern="^[0-9]+[.,]?[0-9]*$"
									// scale="sm"
									value={expectedRoi}
									placeholder="0.0"
									onChange={handleExpectedRoiChange}
								/>
							</div>
							<IconButton icon={IconEnum.ICON_CHECKED} onClick={onExitRoiEditing} />
						</>
					) : (
						<>
							<div className={styles.roiDisplayContainer} onClick={onEnterEditing}>
								{/* Dollar sign is separate cause its not supposed to scroll with a number if number is huge */}
								<span className="text text-xl text-bold">$</span>
								<span
									className={clsx(styles.roiDollarAmount, 'text text-xl text-bold')}
									fadeOut={roiUSD > TRILLION}
								>
									{roiUSD.toLocaleString('en', {
										minimumFractionDigits: roiUSD > MILLION ? 0 : 2,
										maximumFractionDigits: roiUSD > MILLION ? 0 : 2
									})}
								</span>
							</div>
							<IconButton scale="sm" variant="text" onClick={onEnterEditing}>
								{/* <PencilIcon color="primary" /> */}
							</IconButton>
						</>
					)}
				</div>
				<span className="text text-sm">
					~ {roiTokens} {earningTokenSymbol} (
					{roiPercentage.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					%)
				</span>
			</div>
		</div>
	)
}

export default RoiCard
