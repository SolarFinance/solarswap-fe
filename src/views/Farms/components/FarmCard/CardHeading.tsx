import { Token } from '@solarswap/sdk'
// import { FarmAuctionTag, CoreTag } from 'components/Tags'
// import { TokenPairImage } from 'components/TokenImage'
import Skeleton from 'react-loading-skeleton'

export interface ExpandableSectionProps {
	lpLabel?: string
	multiplier?: string
	isCommunityFarm?: boolean
	token: Token
	quoteToken: Token
}

// const Wrappers

const CardHeading: React.FC<ExpandableSectionProps> = ({ lpLabel, multiplier, isCommunityFarm, token, quoteToken }) => {
	return (
		<div justifyContent="space-between" alignItems="center" mb="12px">
			{/* <TokenPairImage
				variant="inverted"
				primaryToken={token}
				secondaryToken={quoteToken}
				width={64}
				height={64}
			/> */}
			{/* <Flex flexDirection="column" alignItems="flex-end">
				<Heading mb="4px">{lpLabel.split(' ')[0]}</Heading>
				<Flex justifyContent="center">
					{isCommunityFarm ? <FarmAuctionTag /> : <CoreTag />}
					{multiplier ? (
						<MultiplierTag variant="secondary">{multiplier}</MultiplierTag>
					) : (
						<Skeleton ml="4px" width={42} height={28} />
					)}
				</Flex>
			</Flex> */}
		</div>
	)
}

export default CardHeading
