// Import React and Ionic React Hooks
import { useState, useEffect } from 'react';
import { isPlatform } from '@ionic/react';

// Import Capacitor to use Camera feature
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'; 
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';


const PHOTO_STORAGE = 'photos';
/**
 * 
 * @returns filepath, webviewPath, photos, takePhoto, 
 */
export function usePhotoGallery() {
    const [ photos, setPhotos ] = useState<UserPhoto[]>([]);

    const savePicture = async (photo: Photo, fileName: string): Promise<UserPhoto> => {
        let base64Data: string | Blob;
        // "hybrid" will detect Cordova or Capacitor:
        if (isPlatform('hybrid')) {
            const file = await Filesystem.readFile({
                path: photo.path!,
            });
            base64Data = file.data;
        } else {
            base64Data = await base64FromPath(photo.webPath!);
        }
        

        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Data,
        });

        if (isPlatform('hybrid')) {
            // Display the new image by rewriting the 'file://' path to HTTP
            // Details: https://ionicframework.com/docs/building/webview#file-protocol
            return {
                filepath: savedFile.uri,
                webviewPath: Capacitor.convertFileSrc(savedFile.uri),
            };
        } else {
            // Use webPath to display the new image instead of base64 since it's
            // already loaded into memory
            return {
                filepath: fileName,
                webviewPath: photo.webPath,
            };
        }
    }

    useEffect(() => {
        const loadSaved = async() => {
            const { value } = await Preferences.get({ key: PHOTO_STORAGE });
            const photosInPreferences = (value? JSON.parse(value) : []) as UserPhoto[];
            
            if (!isPlatform('hybrid')) {
                for (let photo of photosInPreferences) {
                    const file = await Filesystem.readFile({
                        path: photo.filepath,
                        directory: Directory.Data,
                    });
                    // Web platform only: Load the photo as base64 data
                    photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
                }
            }
            setPhotos(photosInPreferences);
        };
        loadSaved();
    }, []);
    
    const takePhoto = async () => {
        const photo = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100,
        });
        
        const fileName = Date.now() + '.jpeg';
        const savedFileImage = await savePicture(photo, fileName);
        const newPhotos = [savedFileImage, ...photos];
        setPhotos(newPhotos);
        Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });
    };

    /**
     * deletePhoto
     */
    const deletePhoto = async (photo: UserPhoto) => {
        // Remove this photo from the Photos reference data array
        const newPhotos = photos.filter((p) => p.filepath !== photo.filepath);

        // Update photos array cache by overwriting the existing photo array
        Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });

        // Delete photo file from filesystem
        const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/' + 1));
        await Filesystem.deleteFile({
            path: filename,
            directory: Directory.Data,
        });
        setPhotos(newPhotos);
    };


    return {
        photos,
        takePhoto,
        deletePhoto,
    };
}

/**
 * The base64FromPath method is a helper util that downloads a file from the supplied path
 * and returns a base64 representation of that file.
 * @param path 
 * @returns 
 */
export async function base64FromPath(path: string): Promise<string> {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject('method did not return a string');
            }
        };
        reader.readAsDataURL(blob);
    });
}

// Create a userPhoto function
export interface UserPhoto {
    filepath: string;
    webviewPath?: string;
}