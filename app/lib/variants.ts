import { Variants, Transition } from "framer-motion"; 

// For parent-child staggering
export  const fadeInVariants = {
    hidden:{opacity:0},
    show: {
      opacity: 1,
      transition: {
        staggerChildren:0.2,
        delayChildren: 0.1, 
      } as Transition,
    }
  }

// For staggered child elements 
export  const itemsVariants = {
    hidden: {opacity:0,
              y: -20,
            },
    show: {opacity:1,
             y: 0,
             transition: {
            duration: 0.4,
            ease: [0, 0, 0.58, 1], 
        } as Transition,
    },
  }

//---------- stats page ---------------
  // Variants for independent game detail section 
  export const gameDetailVariants: Variants = {
    initial: { 
        opacity: 0, 
        y: -20 
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            // Stagger settings to create a delay between title and cards 
            staggerChildren: 0.1, 
            delayChildren: 0.1,
            duration: 0.3,
        } as Transition,
    },
    // Settings for the old element to fade out when the game changes
    exit: { 
        opacity: 0, 
        y: -10,
        transition: {
            duration: 0.1
        } as Transition,
    }
};

// For child elements within gameDetailVariants (stats pages)
export const detailItemVariants: Variants = {
    initial: { 
        opacity: 0, 
        y: -20 
    },
    animate: { 
        opacity: 1, 
        y: 0,
        transition: {
            duration: 0.3
        } as Transition,
    },
    exit: {
        opacity: 0, 
        y: -10,
        transition: {
            duration: 0.2
        } as Transition,
    }
};