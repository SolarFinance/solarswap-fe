import { ZAPIN_ADDRESS } from 'config/constants'
import { CHAIN_ID } from 'config/constants/networks'
import { useZapInContract } from './useContract'
import { useSingleCallResult } from '../state/multicall/hooks'

function useZapOutAmount(tokenA: string, tokenB: string, pool: string, userInLiquidity: string): undefined {
	const zapInContract = useZapInContract(ZAPIN_ADDRESS[CHAIN_ID], false)

	const zapOutAmount: any = useSingleCallResult(zapInContract, 'calculateZapOutAmount', [
		tokenA,
		tokenB,
		pool,
		userInLiquidity === '0' ? undefined : userInLiquidity // https://github.com/AstraProtocol/astra-defi-fe/issues/12
	])?.result?.[0]
	return zapOutAmount?.toString() || 0
}

export default useZapOutAmount
