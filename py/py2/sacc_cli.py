#!/usr/bin/env python

# difference between this and calc_sbpca/python/SAcC.py is that this resampes resulting audioread data
# rather than having to resample the audiofile first using ffmpeg then process it. This is to make it more
# consistent with how Voxit/MATLAB does things

import os
import sys
import samplerate

# note: these are softlinks. They must point to wherever calc_sbpca/python/SAcC.py is
if hasattr(sys, "frozen"):
    from SAcC_BUNDLE import *
else:
    from SAcC import *

def main(argv):
    """ Main routine to calculate SAcC from wav file """
    if len(argv) != 3:
        raise NameError( ("Usage: ", argv[0],
                          " inputsound.wav outputpitchtrack.txt") )

    inwavfile = argv[1]
    outptfile = argv[2]

    # Setup config
    config = default_config()

    # Configure
    sacc_extractor = SAcC(config)
    
    # If we were really being consistent, we'd use librosa.load here like we did in intensity_measures.py instead of audioread,
    # but if it ain't broke. Anyways, I'm not sure if librosa supports python 2
    data, srate = audioread(inwavfile)
    if srate != config['SBF_sr']:
        data = samplerate.resample(data, config['SBF_sr'] / srate, 'sinc_best')
    
    features =  sacc_extractor.sacc(data, config['SBF_sr'])

    # Write the data out
    np.savetxt(outptfile, features, fmt='%.3f', delimiter=' ', newline='\n')


# Run the main function if called from the command line
if __name__ == "__main__":
    import sys
    main(sys.argv)