// specify port number when establishing websocket connections
// quickfix for not being able to establish websockets with webserver because webserver doesn't like me
var PORT = 5000;

var db = new BS.DB([], `:${PORT}/_db`);
var attach = new A.Attachments(`:${PORT}/_attach`);

FARM.track(`:${PORT}/`);
