import { useEffect, useRef, useState } from "react";
import { hasData, includeDocInSelf } from "../utils/Utils"
import ProsodicContent from "./ProsodicContent";
import DocCardHeader from "./DocCardHeader";
import TranscriptInput from "./TranscriptInput";

function DocCard(props) {

    let { doc, onDragEnter } = props;

    const [ hasUnfolded, setHasUnfolded ] = useState(false);        // for roll-down animation not to activate every time docs are re-ordered
    const [ pmContext, setPMContext ] = useState();       // so header can know prosodic content data, like selection window

    const getClasses = () => `driftitem ${ doc.grabbed ? 'grabbed' : '' } ${ !hasUnfolded ? 'firstunfold' : '' }`;

    useEffect(() => {
        setTimeout(() => setHasUnfolded(true), 300);
    }, []);

    return (
        <div className={ getClasses() } onPointerOver={ () => onDragEnter(doc.id) }>
            <DocCardHeader { ...{ ...props, pmContext } } />
            <div className="driftitem-content">
            {
                hasData(doc) ?
                    <ProsodicContent { ...{ ...includeDocInSelf(doc), setPMContext } } /> :
                    <TranscriptInput { ...includeDocInSelf(doc) } />
            }
            </div>
        </div>  
    );
}



export default DocCard;