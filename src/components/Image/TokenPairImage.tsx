import React from 'react'
import { TokenPairImageProps, variants } from './types'
import Wrapper from './Wrapper'
import TokenImage from './TokenImage'
import styles from './styles.module.scss'

const TokenPairImage: React.FC<TokenPairImageProps> = ({
	primarySrc,
	secondarySrc,
	width,
	height,
	variant = variants.DEFAULT,
	primaryImageProps = {},
	secondaryImageProps = {},
	...props
}) => {
	const secondaryImageSize = Math.floor(width / 2)

	return (
		<Wrapper width={width} height={height} {...props}>
			<TokenImage
				className={styles.primaryImage}
				variant={variant}
				src={primarySrc}
				width={width / 1.5}
				height={height / 1.5}
				{...primaryImageProps}
			/>
			<TokenImage
				className={styles.secondaryImage}
				variant={variant}
				src={secondarySrc}
				width={secondaryImageSize}
				height={secondaryImageSize}
				{...secondaryImageProps}
			/>
		</Wrapper>
	)
}

export default TokenPairImage
