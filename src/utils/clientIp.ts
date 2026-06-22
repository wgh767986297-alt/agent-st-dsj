let cachedIpPromise: Promise<string> | null = null

const privateIpv4Pattern =
  /(?:^|\s)((?:10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3})/

export const getClientIp = () => {
  if (cachedIpPromise) {
    return cachedIpPromise
  }

  cachedIpPromise = new Promise<string>((resolve) => {
    if (!window.RTCPeerConnection) {
      resolve('')
      return
    }

    const peerConnection = new RTCPeerConnection({ iceServers: [] })
    let settled = false

    const finish = (ip = '') => {
      if (settled) {
        return
      }
      settled = true
      peerConnection.close()
      resolve(ip)
    }

    peerConnection.onicecandidate = (event) => {
      const candidate = event.candidate?.candidate || ''
      const match = candidate.match(privateIpv4Pattern)
      if (match?.[1]) {
        finish(match[1])
      }
    }

    peerConnection.createDataChannel('client-ip')
    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .catch(() => finish())

    window.setTimeout(() => finish(), 800)
  })

  return cachedIpPromise
}
