// we do this because React's Audio code is SLOW on multiple play/pauses; loadAudio is plain JS code using plain JS Audio
const useAudio = (id, url) => {
    // eslint-disable-next-line no-undef
    return loadAudio(id, url);
};

export default useAudio;