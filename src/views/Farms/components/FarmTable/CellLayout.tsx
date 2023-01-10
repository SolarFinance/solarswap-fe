interface CellLayoutProps {
	label?: string
}

const CellLayout: React.FC<CellLayoutProps> = ({ label = '', children }) => {
	return (
		<div>
			{label && <span className="text text-sm text-left contrast-color-70">{label}</span>}
			<div className="flex flex-align-center" style={{ minHeight: 24 }}>
				{children}
			</div>
		</div>
	)
}

export default CellLayout
