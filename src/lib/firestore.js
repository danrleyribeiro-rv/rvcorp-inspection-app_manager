// src/lib/firestore.js
import { 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp,
    limit,
    Timestamp 
  } from "firebase/firestore";
  import { db } from "./firebase";
  
  // Helper to convert a Firestore object to a plain JavaScript object with ID
  const converter = {
    fromFirestore: (snapshot, options) => {
      const data = snapshot.data(options);
      return {
        ...data,
        id: snapshot.id,
        created_at: data.created_at ? data.created_at.toDate().toISOString() : null,
        updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : null,
        deleted_at: data.deleted_at ? data.deleted_at.toDate().toISOString() : null
      };
    }
  };
  
  // Generic fetch operation that replaces Supabase's from().select()
  export const fetchCollection = async (collectionName, options = {}) => {
    try {
      const { 
        filters = [], 
        orderByField = null, 
        orderDirection = 'desc', 
        limitTo = null, 
        includeSoftDeleted = false 
      } = options;
  
      let constraints = [...filters];
      
      // Add "deleted_at is null" filter unless includeSoftDeleted is true
      if (!includeSoftDeleted) {
        constraints.push(where('deleted_at', '==', null));
      }
  
      // Create the query with filters
      let q = query(collection(db, collectionName), ...constraints);
      
      // Add ordering if specified
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      // Add limit if specified
      if (limitTo) {
        q = query(q, limit(limitTo));
      }
  
      // Execute the query
      const snapshot = await getDocs(q);
      
      // Convert the documents with the converter
      return snapshot.docs.map(doc => converter.fromFirestore(doc));
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Get a single document by ID
  export const fetchDocument = async (collectionName, id) => {
    try {
      const docRef = doc(db, collectionName, id);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        throw new Error(`Document not found in ${collectionName}`);
      }
      
      return converter.fromFirestore(snapshot);
    } catch (error) {
      console.error(`Error fetching document from ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Insert a new document
  export const insertDocument = async (collectionName, data) => {
    try {
      // Add timestamps
      const dataWithTimestamps = {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null
      };
      
      const docRef = await addDoc(collection(db, collectionName), dataWithTimestamps);
      
      // Return the newly created document
      const newDoc = await getDoc(docRef);
      return {
        ...converter.fromFirestore(newDoc),
        id: docRef.id
      };
    } catch (error) {
      console.error(`Error inserting into ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Update a document
  export const updateDocument = async (collectionName, id, data) => {
    try {
      const docRef = doc(db, collectionName, id);
      
      // Add updated_at timestamp
      const dataWithTimestamp = {
        ...data,
        updated_at: serverTimestamp()
      };
      
      await updateDoc(docRef, dataWithTimestamp);
      
      // Return updated document
      const updatedDoc = await getDoc(docRef);
      return converter.fromFirestore(updatedDoc);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Soft delete a document (set deleted_at field)
  export const softDeleteDocument = async (collectionName, id) => {
    try {
      const docRef = doc(db, collectionName, id);
      
      await updateDoc(docRef, {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Error soft deleting document from ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Hard delete a document (completely remove)
  export const hardDeleteDocument = async (collectionName, id) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error(`Error hard deleting document from ${collectionName}:`, error);
      throw error;
    }
  };
  
  // Utility function to convert JavaScript Date to Firestore Timestamp
  export const dateToTimestamp = (date) => {
    if (!date) return null;
    return Timestamp.fromDate(new Date(date));
  };