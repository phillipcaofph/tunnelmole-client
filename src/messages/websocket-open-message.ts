import { Headers } from "../http/headers";

export default interface WebsocketOpenMessage
{
    type: string,
    socketId: string,
    url: string,
    headers: Headers,
}
