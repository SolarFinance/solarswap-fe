import { useExpertModeManager } from 'state/user/hooks'
import GlobalSettings from 'components/Menu/GlobalSettings'
import Link from 'next/link'
import Transactions from './Transactions'
import QuestionHelper from '../QuestionHelper'
import { Icon, IconEnum } from '@astraprotocol/astra-ui'
import NotificationDot from 'components/NotificationDot'

interface Props {
	title: string
	subtitle: string
	helper?: string
	backTo?: string
	noConfig?: boolean
}


const AppHeader: React.FC<Props> = ({ title, subtitle, helper, backTo, noConfig = false }) => {
	const [expertMode] = useExpertModeManager()

	return (
		<div className="flex flex-align-center flex-justify-space-between padding-md width-100 border border-base">
			<div className="flex flex-align-center">
				{backTo && (
					<Link passHref href={backTo}>
						<Icon icon={IconEnum.ICON_BACK} />
					</Link>
				)}
				<div>
					<span className="text text-lg margin-bottom-xs">{title}</span>
					<div className="flex flex-align-center">
						{helper && <QuestionHelper text={helper} placement="top-start" />}
						<span className="text text-base">{subtitle}</span>
					</div>
				</div>
			</div>
			{!noConfig && (
				<div className="flex flex-align-center">
					<NotificationDot show={expertMode}>
						<GlobalSettings />
					</NotificationDot>
					<Transactions />
				</div>
			)}
		</div>
	)
}

export default AppHeader
