import { useState } from 'react'
import { useTranslation } from 'contexts/Localization'
import { getApy } from 'utils/compoundApyHelpers'
import { Icon, IconEnum, Typography } from '@astraprotocol/astra-ui'
import styles from './styles.module.scss'
import { useTooltip } from 'hooks/useTooltip'

interface RoiCalculatorFooterProps {
	isFarm: boolean
	apr: number
	displayApr: string
	autoCompoundFrequency: number
	multiplier: string
	linkLabel: string
	linkHref: string
	performanceFee: number
}

const RoiCalculatorFooter: React.FC<RoiCalculatorFooterProps> = ({
	isFarm,
	apr,
	displayApr,
	autoCompoundFrequency,
	multiplier,
	linkLabel,
	linkHref,
	performanceFee
}) => {
	const [isExpanded, setIsExpanded] = useState(false)
	const { t } = useTranslation()
	const {
		targetRef: multiplierRef,
		tooltip: multiplierTooltip,
		tooltipVisible: multiplierTooltipVisible
	} = useTooltip(
		<>
			<span className="text text-base">
				{t(
					'The Multiplier represents the proportion of ASA rewards each farm receives, as a proportion of the ASA produced each block.'
				)}
			</span>
			<span className="text text-base">
				{t('For example, if a 1x farm received 1 ASA per block, a 40x farm would receive 40 ASA per block.')}
			</span>
			<span className="text text-base">
				{t('This amount is already included in all APR calculations for the farm.')}
			</span>
		</>,
		{ placement: 'top-end', tooltipOffset: [20, 10] }
	)

	const gridRowCount = isFarm ? 4 : 2
	const apy = (getApy(apr, autoCompoundFrequency > 0 ? autoCompoundFrequency : 1, 365, performanceFee) * 100).toFixed(
		2
	)

	return (
		<div className="flex padding-md col width-100" p="16px" flexDirection="column">
			{/* <ExpandableLabel expanded={isExpanded} onClick={() => setIsExpanded(prev => !prev)}>
				{isExpanded ? t('Hide') : t('Details')}
			</ExpandableLabel> */}
			{isExpanded && (
				<div>
					<div
						gridTemplateColumns="2.5fr 1fr"
						gridRowGap="8px"
						gridTemplateRows={`repeat(${gridRowCount}, auto)`}
					>
						{isFarm && (
							<>
								<span className="text text-sm">{t('APR (incl. LP rewards)')}</span>
								<span className="text text-sm text-right">{displayApr}%</span>
							</>
						)}
						<span className="text text-sm">{isFarm ? t('Base APR (ASA yield only)') : t('APR')}</span>
						<span className="text text-sm text-right">{apr.toFixed(2)}%</span>
						<span className="text text-sm">
							{t('APY (%compoundTimes%x daily compound)', {
								compoundTimes: autoCompoundFrequency > 0 ? autoCompoundFrequency : 1
							})}
						</span>
						<span className="text text-sm text-right">{apy}%</span>
						{isFarm && (
							<>
								<span className="text text-sm">{t('Farm Multiplier')}</span>
								<div className="flex flex-justify-end flex-align-end">
									<span className="text text-sm text-right margin-right-xs">{multiplier}</span>
									<span ref={multiplierRef}>
										<Icon icon={IconEnum.ICON_HELP} className="text-base" />
									</span>
									{multiplierTooltipVisible && multiplierTooltip}
								</div>
							</>
						)}
					</div>
					<div className={styles.bulletList}>
						<li>
							<span className="text text-sm text-center">{t('Calculated based on current rates.')}</span>
						</li>
						{isFarm && (
							<li>
								<span className="text text-sm text-center">
									{t(
										'LP rewards: 0.2% trading fees, distributed proportionally among LP token holders.'
									)}
								</span>
							</li>
						)}
						<li>
							<span className="text text-sm text-center">
								{t(
									'All figures are estimates provided for your convenience only, and by no means represent guaranteed returns.'
								)}
							</span>
						</li>
						{performanceFee > 0 && (
							<li>
								<span mt="14px" fontSize="12px" textAlign="center" color="textSubtle" display="inline">
									{t('All estimated rates take into account this pool’s %fee%% performance fee', {
										fee: performanceFee
									})}
								</span>
							</li>
						)}
					</div>
					<div className="flex flex-justify-center margin-top-lg">
						<Typography.Link href={linkHref}>{linkLabel}</Typography.Link>
					</div>
				</div>
			)}
		</div>
	)
}

export default RoiCalculatorFooter
