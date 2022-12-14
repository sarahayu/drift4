import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';

import DocArea from 'components/docarea/DocArea';
import Filelist from 'components/filelist/Filelist';
import MiscPortals from 'components/portals/MiscPortals';

import { GutsContext } from 'context/GutsContext';

import loadGuts from 'utils/Guts';
import { getGentle, getInfos, getSettings, postDeleteDoc } from 'utils/Queries';
import { rearrangeObjectProps, RESOLVING } from 'utils/Utils';


const FilelistPortal = () => createPortal(
    <Filelist />,
    document.getElementById('file-list')
);

const DocAreaPortal = () => createPortal(
    <DocArea />,
    document.getElementById('dashboard')
);

function App() {
    const infosLatestModified = useRef(0);
    
    const [ docs, setDocs ] = useState({});
    const [ guts ] = useState(() => loadGuts());
    const [ calcIntense, setCalcIntense ] = useState(RESOLVING);
    const [ gentlePort, setGentlePort ] = useState(RESOLVING);
    const [ foundGentle, setFoundGentle ] = useState(RESOLVING);
    const [ focusedDocID, setFocusedDocID ] = useState(null);

    // --- START init const functions

    const initSettings = () => {
        // get settings from server so we know some basic drift settings
        getSettings().then(({ calc_intense, gentle_port }) => {
            setCalcIntense(calc_intense);
            setGentlePort(gentle_port);
        })
    }

    const init = () => {
        initSettings();

        document.getElementById("version").textContent = 'v' + process.env.REACT_APP_VERSION;
    }

    const pushNewDocs = data => {        
        infosLatestModified.current = Math.max(infosLatestModified.current, ...data.map(doc => doc.modified_time));

        let newDocs = { ...docs };

        for (let doc of data) {
            if (newDocs[doc.id])
                Object.assign(newDocs[doc.id], doc);
            else
                newDocs[doc.id] = Object.assign(doc, { 
                    grabbed: false, 
                    opened: false,
                    selection: { start_time: null, end_time: null },
                    autoscroll: false,
                    razorTime: null,
                });
        }
        
        setDocs(newDocs);
    };

    const pushNewDoc = (doc, attrs) => {
        setDocs(oldDocs => {
            oldDocs[doc.id] = Object.assign(doc, { 
                grabbed: false, 
                opened: false,
                selection: { start_time: null, end_time: null },
                autoscroll: false,
                razorTime: null,
            }, attrs);

            // place new doc as the first element of docs map
            return rearrangeObjectProps(oldDocs, [ doc.id, ...Object.keys(oldDocs) ]);
        })
    }

    const findGentle = () => {
        if (gentlePort === RESOLVING)
            return;
            
        setFoundGentle(RESOLVING);
      
        if (process.env.REACT_APP_BUILD === "bundle") {
            getGentle({ gentlePort })
                .then(() => {
                    console.log(`Gentle seems to be running! (on port ${ gentlePort })`);
                    setFoundGentle(true);
                })
                .catch(() => {
                    console.log(`Gentle not found on port ${ gentlePort }`);
                    setFoundGentle(false);
                });
        }
        
    };

    const updateDoc = (docid, updatedAttrs) => {
        if (typeof updatedAttrs === 'function')
            setDocs(oldDocs => ({
                ...oldDocs,
                [docid]: {
                    ...oldDocs[docid],
                    ...updatedAttrs(oldDocs[docid]),
                }
            }));
        else
            setDocs(oldDocs => ({
                ...oldDocs,
                [docid]: {
                    ...oldDocs[docid],
                    ...updatedAttrs,
                }
            }));
    };

    const deleteDoc = async docid => {
        const { remove: removedID } = await postDeleteDoc(docid);
        setDocs(oldDocs => {
            delete oldDocs[removedID]
            return { ...oldDocs };
        })
    };

    const globalizeDocs = () => {
        // eslint-disable-next-line no-undef
        T.docs = docs;
    };

    const globalizeDeleteAction = () => {
        // eslint-disable-next-line no-undef
        delete_action = doc => postDeleteDoc(doc.id).then(removedID => {
            // this doesn't work for some reason, but docs are removed serverside so just reload webpage
            // setDocs(oldDocs => {
            //     delete oldDocs[removedID]
            //     return { ...oldDocs };
            // })
        });
    };

    const attachPutFile = async (file, progressCB) => {
        return new Promise(resolve => {
            guts.attach.put_file(file, x => {
                resolve(x);
            }, progressCB)
        })
    }

    // --- END init const functions

    // --- START hooks
    
    useEffect(init, []);

    // whenever gentlePort changes (e.g. through settings), we need to recheck if gentle is running on said port
    useEffect(findGentle, [gentlePort]);

    // these were from vanilla js days when you could access doc stuff from the browser console,
    // reproducing that behavior for maintenance purposes
    useEffect(globalizeDocs, [docs]);
    useEffect(globalizeDeleteAction);

    // *this is where it all starts---get all docs from server and add them to our state
    useQuery(['infos'], () => getInfos({ since: infosLatestModified.current }), {
            refetchInterval: 3000,      // refetch the data every 3 seconds
            onSuccess: pushNewDocs,
        },
    );

    // --- END hooks

    return (
        <GutsContext.Provider value={{
            docs, 
            setDocs,
            updateDoc,
            guts,
            calcIntense,
            setCalcIntense,
            gentlePort,
            setGentlePort,
            foundGentle,
            setFoundGentle,
            focusedDocID,
            setFocusedDocID,
            attachPutFile,
            pushNewDoc,
            deleteDoc,
        }}>
            <FilelistPortal />
            <DocAreaPortal />
            <MiscPortals />
        </GutsContext.Provider>
    );
}

export default App;