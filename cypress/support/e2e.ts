// Custom commands for dev-mode API requests (header-based auth)
Cypress.Commands.add('apiRequest', (method: string, url: string, body?: object) => {
  const headers: Record<string, string> = {
    'x-organization-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'SuperAdmin',
    'x-user-id': 'cypress-test-user',
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    headers,
    body,
    failOnStatusCode: false,
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      apiRequest(method: string, url: string, body?: object): Chainable<Cypress.Response<any>>;
    }
  }
}

export {};
