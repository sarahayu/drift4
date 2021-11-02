
from guts import Root

from twisted.web.server import Site
from twisted.internet import reactor, ssl

class SecureRoot(Root):
    def __init__(self, key_path, crt_path, port=8000, interface='0.0.0.0', dirpath='.'):
        super().__init__(port, interface, dirpath)
        self._key_path = key_path
        self._crt_path = crt_path

    def run_forever(self):
        site = Site(self._root)
        reactor.listenSSL(self._port, site, interface=self._interface, contextFactory=ssl.DefaultOpenSSLContextFactory(self._key_path, self._crt_path))
        print("https://localhost:%d" % (self._port))
        print("Using wss secure")
        reactor.run()        