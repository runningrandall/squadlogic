describe('Athletes API', () => {
  let athleteId: string;

  it('creates an athlete', () => {
    cy.apiRequest('POST', '/athletes', {
      firstName: 'Jane',
      lastName: 'Doe',
      email: `jane.doe.${Date.now()}@test.com`,
      phone: '555-0101',
      positions: ['Forward', 'Midfielder'],
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('athleteId');
      expect(response.body.firstName).to.eq('Jane');
      expect(response.body.lastName).to.eq('Doe');
      athleteId = response.body.athleteId;
    });
  });

  it('lists athletes', () => {
    cy.apiRequest('GET', '/athletes').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.items.length).to.be.greaterThan(0);
    });
  });

  it('gets an athlete by id', () => {
    cy.apiRequest('GET', `/athletes/${athleteId}`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.firstName).to.eq('Jane');
    });
  });
});

describe('Coaches API', () => {
  let coachId: string;

  it('creates a coach', () => {
    cy.apiRequest('POST', '/coaches', {
      firstName: 'Coach',
      lastName: 'Smith',
      email: `coach.smith.${Date.now()}@test.com`,
      certifications: ['USSF A License'],
      specialties: ['Youth Development'],
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('coachId');
      expect(response.body.firstName).to.eq('Coach');
      coachId = response.body.coachId;
    });
  });

  it('lists coaches', () => {
    cy.apiRequest('GET', '/coaches').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.items.length).to.be.greaterThan(0);
    });
  });

  it('gets a coach by id', () => {
    cy.apiRequest('GET', `/coaches/${coachId}`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.firstName).to.eq('Coach');
    });
  });
});
