import { FC, useEffect } from 'react'
import styles from './style.module.scss'

const BodyLock = () => {
	useEffect(() => {
		document.body.style.cssText = `
      overflow: hidden;
    `
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.cssText = `
        overflow: visible;
        overflow: overlay;
      `
		}
	}, [])

	return null
}

interface OverlayProps {
	isUnmounting?: boolean
}

export const Overlay: FC<OverlayProps> = props => {
	return (
		<>
			<BodyLock />
			<div className={styles.overlay} {...props} />
		</>
	)
}

export default Overlay