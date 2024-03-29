import { ChainId, JSBI, Percent, Token } from '@solarswap/sdk'
import { BigNumber } from '@ethersproject/bignumber'
import { mainnetTokens, testnetTokens } from './tokens'

export const ROUTER_ADDRESS = {
	[ChainId.MAINNET]: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
	[ChainId.TESTNET]: '0x3410255e7E6d2e33D85aC07796048713fAdFEcf3',
}

export const ZAP_ADDRESS = {
	[ChainId.MAINNET]: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
	[ChainId.TESTNET]: '0xBE56dE92c45d48C35f4d313a0471F545FA59234d',
}

export const WASA_ADDRESS = {
	[ChainId.MAINNET]: '0xC60F8AF409Eac14d4926e641170382f313749Fdc',
	[ChainId.TESTNET]: '0xC60F8AF409Eac14d4926e641170382f313749Fdc',
}

// a list of tokens by chain
type ChainTokenList = {
	readonly [chainId in ChainId]: Token[]
}

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
	[ChainId.MAINNET]: [mainnetTokens.wbnb],
	[ChainId.TESTNET]: [testnetTokens.wasa, testnetTokens.usdt],
}

/**
 * Addittional bases for specific tokens
 * @example { [WBTC.address]: [renBTC], [renBTC.address]: [WBTC] }
 */
export const ADDITIONAL_BASES: {
	[chainId in ChainId]?: { [tokenAddress: string]: Token[] }
} = {
	[ChainId.TESTNET]: {},
}

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 * @example [AMPL.address]: [DAI, WETH[ChainId.MAINNET]]
 */
export const CUSTOM_BASES: {
	[chainId in ChainId]?: { [tokenAddress: string]: Token[] }
} = {
	[ChainId.TESTNET]: {},
}

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
	[ChainId.MAINNET]: [mainnetTokens.usdt],
	[ChainId.TESTNET]: [testnetTokens.usdt],
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
	[ChainId.MAINNET]: [mainnetTokens.wbnb, mainnetTokens.usdt],
	[ChainId.TESTNET]: [testnetTokens.wasa, testnetTokens.usdt],
}

export const PINNED_PAIRS: {
	readonly [chainId in ChainId]?: [Token, Token][]
} = {
	[ChainId.TESTNET]: [[mainnetTokens.wasa, mainnetTokens.usdt]],
}

export const NetworkContextName = 'NETWORK'

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 50
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20

export const BIG_INT_ZERO = JSBI.BigInt(0)

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE) // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

/**
 * @description used to ensure the user doesn't send so much ASA so they end up with <.01.
 * Make sure enough gas for the transaction.
 * @author tiendn
 * 02/12/2022
 * @todo verified exact number later
 */
export const MIN_ASA: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ASA
export const BETTER_TRADE_LESS_HOPS_THRESHOLD = new Percent(JSBI.BigInt(50), JSBI.BigInt(10000))

export const ZERO_PERCENT = new Percent('0')
export const ONE_HUNDRED_PERCENT = new Percent('1')

// SDN OFAC addresses
export const BLOCKED_ADDRESSES: string[] = []

export { default as farmsConfig } from './farms'
// export { default as poolsConfig } from './pools'

export const FAST_INTERVAL = 10000
export const SLOW_INTERVAL = 60000

// Gelato uses this address to define a native currency in all chains
export const GELATO_NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
// Handler string is passed to Gelato to use PCS router
export const GELATO_HANDLER = 'pancakeswap'
export const GENERIC_GAS_LIMIT_ORDER_EXECUTION = BigNumber.from(500000)

export const EXCHANGE_DOCS_URLS = 'https://docs.solarswap.io/products/solarswap-exchange'
export const LIMIT_ORDERS_DOCS_URL = 'https://docs.solarswap.io/products/solarswap-exchange/limit-orders'

export enum ConnectorNames {
	Injected = 'injected',
	WalletConnect = 'walletconnect',
	BSC = 'bsc',
	Blocto = 'blocto',
	WalletLink = 'walletlink',
	AstraWallet = 'astrawallet',
	AstraConnect = 'astraconnect',
}
