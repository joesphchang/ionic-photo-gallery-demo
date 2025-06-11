// Import React and Ionic React Hooks
import { useState, useEffect } from 'react';
import { isPlatform } from '@ionic/react';

// Import Capacitor to use Camera feature
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'; 
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Create a function named usePhotoGallery
export function usePhotoGallery() {
    const [photos, setPhotos ] = useState<UserPhoto[]>([]);
    const fileName = Date.now() + '.jpeg';
    
    const takePhoto = async () => {
        const photo = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100,
        });

        const newPhotos = [
            {
                filepath: fileName,
                webviewPath: photo.webPath,
            },
            ...photos,
        ];
        setPhotos(newPhotos);
    };
    


    return {
        photos,
        takePhoto,
    };
}

// Create a userPhoto function
export interface UserPhoto {
    filepath: string;
    webviewPath?: string;
}