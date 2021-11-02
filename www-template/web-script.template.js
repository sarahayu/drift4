// PORTVAR replaced with hosted port number so this can work on a web server

if (!window.location.port)
{
    var db = new BS.DB([], ':$PORTVAR/_db');
    var attach = new A.Attachments(':$PORTVAR/_attach');
    
    FARM.track(':$PORTVAR/');
}

var webRelease = true;