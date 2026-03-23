describe('Organizations API', () => {
  it('creates an organization', () => {
    cy.apiRequest('POST', '/organizations', {
      name: 'Cypress Test Org',
      slug: `cypress-org-${Date.now()}`,
      ownerUserId: 'cypress-user',
      billingEmail: 'cypress@test.com',
      phone: '555-0199',
      address: '999 Test Ave',
      city: 'Testville',
      state: 'TX',
      zip: '75001',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('organizationId');
      expect(response.body.name).to.eq('Cypress Test Org');
      expect(response.body.status).to.eq('active');
    });
  });

  it('lists organizations', () => {
    cy.apiRequest('GET', '/organizations').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('items');
      expect(response.body.items).to.be.an('array');
    });
  });
});
