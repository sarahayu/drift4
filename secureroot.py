
from guts import Root

from twisted.web import server, static, resource
from twisted.internet import reactor, ssl

class FolderlessFile(static.File):
    def directoryListing(self):
        return resource.NoResource()

class FolderlessRoot(Root):
    def __init__(self, port=8000, interface='0.0.0.0', dirpath='.'):
        super().__init__(port, interface, dirpath)
        self._root = FolderlessFile(dirpath)

class SecureRoot(FolderlessRoot):
    def __init__(self, key_path, crt_path, port=8000, interface='0.0.0.0', dirpath='.'):
        super().__init__(port, interface, dirpath)
        self._key_path = key_path
        self._crt_path = crt_path

    def run_forever(self):
        site = server.Site(self._root)
        reactor.listenSSL(self._port, site, interface=self._interface, contextFactory=ssl.DefaultOpenSSLContextFactory(self._key_path, self._crt_path))
        print("https://localhost:%d" % (self._port))
        print("Using wss secure")
        reactor.run()