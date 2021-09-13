// portvar replaced with hosted port number so this can work on a web server,
// feel free to delete the optional dbpath arguments when running on localhost

var db = new BS.DB([], ':PORTVAR/_db');
var attach = new A.Attachments(':PORTVAR/_attach');

FARM.track(':PORTVAR/');
