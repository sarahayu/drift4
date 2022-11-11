import { useEffect, useRef, useState } from "react";

// helps us access updated state values in function closures
const useRefState = initVal => {

    const [state, setState] = useState(initVal);
    const ref = useRef(state);

    useEffect(() => { ref.current = state; }, [state]);

    const setRefState = newState => setState(ref.current = newState);

    return [state, setState, ref, setRefState];
};

export default useRefState;