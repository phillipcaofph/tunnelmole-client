export default interface WebsocketCloseMessage
{
    type: string,
    socketId: string,
    code: number,
    data?: string,
}
