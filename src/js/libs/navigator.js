export class Navigator {
  static URL (_url = undefined) {
    if (_url === undefined) {
      return window.location.href
    }
    window.history.pushState({}, null, _url)
  }

  static Init () {
    Navigator.host = 'http://darciarz.pl'
    Navigator.cookies = Navigator.initCookies()
    Navigator.token = Navigator.cookies['jwt_token']
  }

  static initCookies () {
    const raw = document.cookie.split('; ')
    const cookies = []
    for (let pair of raw) {
      const arr = pair.split('=')
      if (!arr[1]) arr[1] = ''
      cookies[arr[0]] = arr[1]
    }
    return cookies
  }

  static Token (_jwt = undefined) {
    if (_jwt === undefined) {
      let base64Url = Navigator.token.split('.')[1]
      let base64 = base64Url.replace('-', '+').replace('_', '/')
      return JSON.parse(window.atob(base64))
    }
    return Navigator.token
  }

  static LoadAccess () {
    return new Promise((resolve, reject) => {
      const _headers = Navigator.Headers('json')
      const url = Navigator.host + '/api/client/access'
      const request = new Request(url, { method: 'GET', headers: _headers })
      fetch(request)
        .then(res => res.json())
        .then(data => {
          resolve(data.jwt)
        })
    })
  }

  static LoadContent (_url) {
    return new Promise((resolve, reject) => {
      const _headers = Navigator.Headers('html')
      const request = new Request(_url, { method: 'GET', headers: _headers })
      fetch(request)
        .then(res => res.text())
        .then(data => {
          resolve(data)
        })
    })
  }

  static Headers (_type) {
    const headers = new Headers()
    let contentType = 'text/plain'
    switch (_type) {
      case 'json':
        contentType = 'application/json'
        break
      case 'html':
        contentType = 'text/html'
        break
    }
    if (Navigator.token) {
      headers.append('Authorization', 'Bearer ' + Navigator.token)
    }
    headers.append('Accept', contentType)
    return headers
  }
}
