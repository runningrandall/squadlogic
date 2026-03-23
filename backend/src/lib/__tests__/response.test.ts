import { success, created, noContent } from '../response.js';

function createMockReply() {
  const reply: any = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

describe('response helpers', () => {
  it('success sends 200 with body by default', () => {
    const reply = createMockReply();
    success(reply, { data: 'test' });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ data: 'test' });
  });

  it('success sends custom status code', () => {
    const reply = createMockReply();
    success(reply, { data: 'test' }, 202);
    expect(reply.status).toHaveBeenCalledWith(202);
  });

  it('created sends 201 with body', () => {
    const reply = createMockReply();
    created(reply, { id: '123' });
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(reply.send).toHaveBeenCalledWith({ id: '123' });
  });

  it('noContent sends 204 with no body', () => {
    const reply = createMockReply();
    noContent(reply);
    expect(reply.status).toHaveBeenCalledWith(204);
    expect(reply.send).toHaveBeenCalled();
  });
});
