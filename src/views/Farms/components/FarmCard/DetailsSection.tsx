import { useTranslation } from 'contexts/Localization'
import Skeleton from 'react-loading-skeleton'

export interface ExpandableSectionProps {
	bscScanAddress?: string
	infoAddress?: string
	removed?: boolean
	totalValueFormatted?: string
	lpLabel?: string
	addLiquidityUrl?: string
}

// const Wrapper = styled.div`
//   margin-top: 24px;
// `

// const StyledLinkExternal = styled(LinkExternal)`
//   font-weight: 400;
// `

const DetailsSection: React.FC<ExpandableSectionProps> = ({
	bscScanAddress,
	infoAddress,
	removed,
	totalValueFormatted,
	lpLabel,
	addLiquidityUrl
}) => {
	const { t } = useTranslation()

	return (
		<div className="margin-top-lg">
			<div className="flex flex-justify-space-between">
				<span className="text text-sm">{t('Total Liquidity')}:</span>
				{totalValueFormatted ? (
					<span className="text text-sm">{totalValueFormatted}</span>
				) : (
					<Skeleton width={75} height={25} />
				)}
			</div>
			{/* {!removed && (
        <StyledLinkExternal href={addLiquidityUrl}>{t('Get %symbol%', { symbol: lpLabel })}</StyledLinkExternal>
      )}
      <StyledLinkExternal href={bscScanAddress}>{t('View Contract')}</StyledLinkExternal>
      <StyledLinkExternal href={infoAddress}>{t('See Pair Info')}</StyledLinkExternal> */}
		</div>
	)
}

export default DetailsSection
