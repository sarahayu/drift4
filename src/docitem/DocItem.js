import { useEffect, useState } from "react";
import { hasData, includeDocInSelf } from "../utils/Utils"
import DocInfo from "./DocInfo";
import Topbar from "./Topbar";
import TranscriptInput from "./TranscriptInput";

function DocItem(props) {

    const [ hasUnfolded, setHasUnfolded ] = useState(false);        // for roll-down animation not to activate every time docs are re-ordered

    const getClasses = () => `driftitem ${ props.doc.grabbed ? 'grabbed' : '' } ${ !hasUnfolded ? 'firstunfold' : '' }`;

    useEffect(() => {
        setTimeout(() => setHasUnfolded(true), 300);
    }, []);

    return (
        <div className={ getClasses() } onPointerOver={ () => props.onDragEnter(props.doc.id) }>
            <Topbar { ...props } />
            <div className="driftitem-content">
            {
                hasData(props.doc) ?
                    <DocInfo { ...includeDocInSelf(props.doc) } /> :
                    <TranscriptInput { ...includeDocInSelf(props.doc) } />
            }
            </div>
        </div>  
    );
}



export default DocItem;