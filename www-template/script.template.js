// PORTVAR replaced with hosted port number so this can work on a web server

var db = new BS.DB([], !$BUNDLE ? ':$PORTVAR/_db' : null);
var attach = new A.Attachments( !$BUNDLE ? ':$PORTVAR/_attach' : null);

FARM.track(!$BUNDLE ? ':$PORTVAR/' : null);
