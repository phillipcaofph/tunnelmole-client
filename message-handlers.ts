import hostnameAssigned from "./src/message-handlers/hostname-assigned.js";
import forwardedRequest from "./src/message-handlers/forwarded-request.js";
import hostnameAlreadyTaken from "./src/message-handlers/hostname-already-taken.js";
import invalidSubscription from "./src/message-handlers/invalid-subscription.js";
import domainAlreadyReserved from "./src/message-handlers/domain-already-reserved.js";
import domainReservationError from "./src/message-handlers/domain-reservation-error.js";
import tooManyDomains from "./src/message-handlers/too-many-domains.js";
import clientMessage from "./src/message-handlers/client-message.js";
import HostipWebSocket from "./src/websocket/host-ip-websocket.js"
import WebSocket from "ws";
import WebsocketCloseMessage from "./src/messages/websocket-close-message.js";
import WebsocketOpenMessage from "./src/messages/websocket-open-message.js";
import { Options } from './src/options.js';
import WebsocketHostMessage from "./src/messages/websocket-host-message.js";

/**
 * Websocket message handlers for different message types
 * Like app.ts for express, but with handlers for different message types instead of URLs
 */
const messageHandlers = {
    hostnameAssigned,
    forwardedRequest,
    hostnameAlreadyTaken,
    invalidSubscription,
    domainAlreadyReserved,
    domainReservationError,
    tooManyDomains,
    clientMessage,
    WebSocketCloseMessage,
    WebSocketOpenMessage,
    WebSocketHostMessage,
    WebSocketClientMessage,
}

export { messageHandlers };

function WebSocketCloseMessage(message: WebsocketCloseMessage, websocket: HostipWebSocket) {
    if (!websocket.sockets) return console.log('WebSocketCloseMessage impossible')

    const { socketId, code, data } = message
    console.log('me', message)
    const found = websocket.sockets.get(socketId)
    console.log('found', found?.readyState)
    if (found.readyState === WebSocket.OPEN) found?.close(code, data)
}

function WebSocketOpenMessage(message: WebsocketOpenMessage, websocket: HostipWebSocket, options: Options) {
    const port = options.port
    const { socketId, url, headers } = message
    // console.log('WebSocketOpenMessage', 'ws://127.0.0.1:' + port + url, headers)

    delete headers['sec-websocket-key']

    // Create end to end tunnel
    if (!websocket.sockets) websocket.sockets = new Map()
    const datatunnel = new HostipWebSocket('ws://127.0.0.1:' + port + url,
      headers['sec-websocket-protocol'], {
      headers,
    })
    websocket.sockets.set(socketId, datatunnel)

    // Forward messages from client to server
    // console.log('WebSocketOpenMessage.ready', datatunnel.readyState)
    datatunnel.on('open', () => {
      // console.log('WebSocketOpenMessage.open', datatunnel.readyState)
    })
    datatunnel.on('message', (data) => {
      const message = { type: 'WebSocketClientMessage', socketId, data }
      websocket.sendMessage(message)
    })
    datatunnel.on('close', () => {
      const close = { type: 'WebSocketCloseMessage', socketId }
      websocket.sendMessage(close)
    })
    datatunnel.on('error', (a) => {
      // Close on error
      const close = { type: 'WebSocketCloseMessage', socketId }
      websocket.sendMessage(close)
    })
}

async function WebSocketHostMessage(
    message: WebsocketHostMessage,
    websocket: HostipWebSocket
  ) {
    // console.log('WebSocketHostMessage')
    if (!websocket.sockets) {
      // console.log('no sockets, wait')
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (!websocket.sockets) return // console.log('bummer')

    const { socketId, data } = message
    const datatunnel = websocket.sockets.get(socketId)
    if (!datatunnel) return // console.log('no datatunnel')

    if (datatunnel.readyState === WebSocket.CONNECTING) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (datatunnel.readyState !== WebSocket.OPEN) return

    datatunnel.send(data)
}

function WebSocketClientMessage() {
    console.log('WebSocketClientMessage impossible?')
}
