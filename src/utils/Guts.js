export default function loadGuts() {
    /* eslint-disable no-undef */ // eslint doesn't like DB and A globals

    let db, attach;

    db = new BS.DB();
    attach = new A.Attachments();
    
    return { db, attach };

    /* eslint-enable no-undef */
}