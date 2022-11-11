import { useContext } from "react";
import { GutsContext } from 'context/GutsContext';
import useDragger from "hooks/useDragger";
import FileListItem from "./FileListItem";

function Filelist() {
    const { docs, setDocs, updateDoc } = useContext(GutsContext);
    const { onDragStart, onDragEnter, onDragEnd } = useDragger({ setDocs, updateDoc });

    const toggleOpenDoc = docid => {
        updateDoc(docid, doc => ({
            opened: !doc.opened,
            hasUnfolded: false,
        }));
    }

    return (
        <>
        <a className="acsblty-skip" href="#main-content">Skip file list</a>
        {
            Object.values(docs).map((doc) => 
               <FileListItem {...{ ...doc, toggleOpenDoc, onDragStart, onDragEnter, onDragEnd }} key={ doc.id } />
            )
        }
        </>
    );
}

export default Filelist;