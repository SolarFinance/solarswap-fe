describe('Info Page', () => {
	const HOST = 'http://localhost:3000'
	it('loads info overview', () => {
		cy.visit(`${HOST}/info`)
		cy.get('#info-overview-title').should('be.visible')
	})

	it('loads info pools page', () => {
		cy.visit(`${HOST}/info/pools`)
		cy.get('#info-pools-title').should('be.visible')
	})

	// skip this test because it's not stable
	it.skip('loads single pool page', () => {
		cy.visit(`${HOST}/info/pool/0x58f876857a02d6762e0101bb5c46a8c1ed44dc16`)
		cy.get('#info-pool-pair-title').should('be.visible')
	})

	it('loads info tokens page', () => {
		cy.visit(`${HOST}/info/tokens`)
		cy.get('#info-tokens-title').should('be.visible')
	})

	// skip this test because it's not stable
	it.skip('loads single token page', () => {
		cy.visit(`${HOST}/info/token/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c`)
		cy.get('#info-token-name-title', { timeout: 15000 }).should('be.visible')
	})
})
