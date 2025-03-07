import { useContext, useEffect } from "react";
import { GutsContext } from 'context/GutsContext';
import useDragger from "hooks/useDragger";
import { elemClassAdd, elemClassRemove } from "utils/Utils";
import DocCard from "./DocCard";

function DocArea() {
    const { docs, setDocs, updateDoc } = useContext(GutsContext);
    const { onDragStart, onDragEnter } = useDragger({ setDocs, updateDoc });

    useEffect(() => {
        const anyDocs = Object.values(docs).length != 0;
        const anyOpened = Object.values(docs).filter(doc => doc.opened).length != 0;
        const anyGrabbed = Object.values(docs).some(doc => doc.grabbed);

        if (anyDocs) {
            elemClassRemove('nofiles', 'show');
            if (anyOpened)
                elemClassRemove('noneselected', 'show');
            else
                elemClassAdd('noneselected', 'show');
        }
        else {
            elemClassAdd('nofiles', 'show');
            elemClassRemove('noneselected', 'show');
        }

        if (anyGrabbed)
            elemClassAdd('dashboard', 'grabbed');
        else 
            elemClassRemove('dashboard', 'grabbed');
    }, [docs]);

    return (
        <>
        {
            Object.values(docs).filter(doc => doc.opened).map(doc => 
                <DocCard key={ doc.id } { ...{ doc, onDragStart, onDragEnter } }/>
            )
        }
        </>
    );
}

export default DocArea;