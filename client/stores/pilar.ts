import { defineStore } from 'pinia';

export const usePilarStore = defineStore('pilar', {
    state: () => {
        return {
            pilars: [
                'Context-Aware Wayfinding (Lalan Ko)',
                'Frictionless Accessibility & Inclusivity',
                'Living, Decentralized Campus Knowledge'
            ]
        }
    },
    actions: {
        addNewPilar(name: string) {
            this.pilars.push(name);
        }
    }
})