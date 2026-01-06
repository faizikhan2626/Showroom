// add-sample-vehicles.js - Script to add sample vehicles to the database
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://user:SuzukiManager123@cluster0.tfd1fcz.mongodb.net/showroom_db?retryWrites=true&w=majority';

async function addSampleVehicles() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB (showroom_db)');
    
    const db = client.db('showroom_db');
    
    // Get the admin user's ID to use as showroomId
    const users = db.collection('users');
    const adminUser = await users.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.error('Admin user not found. Please make sure you have logged in first.');
      return;
    }
    
    const showroomId = adminUser._id;
    console.log('Using showroomId:', showroomId);
    
    // Sample vehicles data
    const sampleVehicles = [
      // Bikes
      {
        type: 'Bike',
        brand: 'Honda',
        model: 'CD 70',
        price: 185000,
        color: 'Red',
        status: 'Stock In',
        engineNumber: 'EN001',
        chassisNumber: 'CH001',
        partner: 'Ahmed Motors',
        partnerCNIC: '42101-1234567-1',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      {
        type: 'Bike',
        brand: 'Yamaha',
        model: 'YBR 125',
        price: 495000,
        color: 'Blue',
        status: 'Stock In',
        engineNumber: 'EN002',
        chassisNumber: 'CH002',
        partner: 'Khan Auto',
        partnerCNIC: '42101-2345678-2',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      {
        type: 'Bike',
        brand: 'Suzuki',
        model: 'GS 150',
        price: 620000,
        color: 'Black',
        status: 'Stock In',
        engineNumber: 'EN003',
        chassisNumber: 'CH003',
        partner: 'Ali Traders',
        partnerCNIC: '42101-3456789-3',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      // Cars
      {
        type: 'Car',
        brand: 'Toyota',
        model: 'Corolla',
        price: 4500000,
        color: 'White',
        status: 'Stock In',
        engineNumber: 'EN004',
        chassisNumber: 'CH004',
        partner: 'Toyota Dealers',
        partnerCNIC: '42101-4567890-4',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      {
        type: 'Car',
        brand: 'Honda',
        model: 'Civic',
        price: 5200000,
        color: 'Silver',
        status: 'Stock In',
        engineNumber: 'EN005',
        chassisNumber: 'CH005',
        partner: 'Honda Center',
        partnerCNIC: '42101-5678901-5',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      // Electric Bikes
      {
        type: 'Electric Bike',
        brand: 'Super Power',
        model: 'SP-70',
        price: 120000,
        color: 'Green',
        status: 'Stock In',
        engineNumber: 'EN006',
        chassisNumber: 'CH006',
        partner: 'Electric Motors',
        partnerCNIC: '42101-6789012-6',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      // Rickshaws
      {
        type: 'Rickshaw',
        brand: 'Qingqi',
        model: 'QM200ZH-9C',
        price: 350000,
        color: 'Yellow',
        status: 'Stock In',
        engineNumber: 'EN007',
        chassisNumber: 'CH007',
        partner: 'Rickshaw Dealers',
        partnerCNIC: '42101-7890123-7',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      },
      // Loaders
      {
        type: 'Loader',
        brand: 'Suzuki',
        model: 'Bolan',
        price: 1800000,
        color: 'White',
        status: 'Stock In',
        engineNumber: 'EN008',
        chassisNumber: 'CH008',
        partner: 'Commercial Vehicles',
        partnerCNIC: '42101-8901234-8',
        showroom: adminUser.showroomName || 'Main Showroom',
        showroomId: showroomId,
        dateAdded: new Date()
      }
    ];
    
    // Insert vehicles into their respective collections
    const collections = {
      'Bike': 'bikes',
      'Car': 'cars',
      'Electric Bike': 'electricbikes',
      'Rickshaw': 'rickshaws',
      'Loader': 'loaders'
    };
    
    for (const vehicle of sampleVehicles) {
      const collectionName = collections[vehicle.type];
      const collection = db.collection(collectionName);
      
      // Check if vehicle already exists (by engine number)
      const existing = await collection.findOne({ engineNumber: vehicle.engineNumber });
      if (!existing) {
        await collection.insertOne(vehicle);
        console.log(`✅ Added ${vehicle.type}: ${vehicle.brand} ${vehicle.model}`);
      } else {
        console.log(`⚠️  ${vehicle.type} ${vehicle.brand} ${vehicle.model} already exists`);
      }
    }
    
    console.log('\n🎉 Sample vehicles added successfully!');
    console.log('You can now view them in the Stock section of your application.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addSampleVehicles();