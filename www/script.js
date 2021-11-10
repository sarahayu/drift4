// this if statement was necessary when a port number was needed to access Drift's endpoints
// feel free to uncomment it if you need the functionality

if (true)
// if (typeof webPort === 'undefined' || window.location.port)
{
    var db = new BS.DB();
    var attach = new A.Attachments();
    
    FARM.track();
}
else
{
    var db = new BS.DB([], `:${webPort}/_db`);
    var attach = new A.Attachments(`:${webPort}/_attach`);
    
    FARM.track(`:${webPort}/`);
}