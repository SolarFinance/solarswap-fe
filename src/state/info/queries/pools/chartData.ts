import { gql } from 'graphql-request'
import { infoClient } from 'utils/graphql'
import { ChartEntry } from 'state/info/types'
import { SS_START } from 'config/constants/info'
import { PairDayDatasResponse } from '../types'
import { mapPairDayData, fetchChartData } from '../helpers'

/**
 *
 * @param skip
 * @param address
 * @returns
 */
const getPoolChartData = async (skip: number, address: string): Promise<{ data?: ChartEntry[]; error: boolean }> => {
	try {
		const query = gql`
			query pairDayDatas($startTime: Int!, $skip: Int!, $address: Bytes!) {
				pairDayDatas(
					first: 1000
					skip: $skip
					where: { pairAddress: $address, date_gt: $startTime }
					orderBy: date
					orderDirection: asc
				) {
					date
					dailyVolumeUSD
					reserveUSD
				}
			}
		`
		const { pairDayDatas } = await infoClient.request<PairDayDatasResponse>(query, {
			startTime: SS_START,
			skip,
			address,
		})
		const data = pairDayDatas.map(mapPairDayData)
		return { data, error: false }
	} catch (error) {
		console.error('Failed to fetch pool chart data', error)
		return { error: true }
	}
}

const fetchPoolChartData = async (address: string): Promise<{ data?: ChartEntry[]; error: boolean }> => {
	return fetchChartData(getPoolChartData, address)
}

export default fetchPoolChartData
