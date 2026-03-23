describe('Health Check', () => {
  it('backend health endpoint returns ok', () => {
    cy.request(`${Cypress.env('apiUrl')}/health`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.deep.eq({ status: 'ok' });
    });
  });
});
