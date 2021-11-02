
if (typeof webPort === 'undefined' || window.location.port)
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