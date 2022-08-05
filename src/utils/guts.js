export default function loadGuts() {
    /* eslint-disable no-undef */ // eslint doesn't like DB and A globals

    let db, attach;

    if (process.env.NODE_ENV === 'development') {
        console.log(`running dev on port ${ process.env.REACT_APP_DRIFT_PORT } (this message might run twice on dev mode due to strict mode. it will not run twice on prod mode [https://reactjs.org/docs/strict-mode.html])`);
        
        db = new BS.DB(undefined, `:${ process.env.REACT_APP_DRIFT_PORT }/_db`);
        attach = new A.Attachments(`:${ process.env.REACT_APP_DRIFT_PORT }/_attach`);
    }
    else {
        db = new BS.DB();
        attach = new A.Attachments();
    }

    return { db, attach };

    /* eslint-enable no-undef */
}