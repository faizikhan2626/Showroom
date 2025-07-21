// lib/models/VehicleModels.ts
import { IVehicleModel } from "../types/vehicle";
import Bike from "./Bike";
import Car from "./Car";
import Rickshaw from "./Rickshaw";
import Loader from "./Loader";
import ElectricBike from "./ElectricBike";

// Add methods to a model
function withVehicleMethods<T>(model: Model<T>): IVehicleModel<T> {
  const schema = model.schema;

  if (!schema.statics.findVehiclesByShowroom) {
    schema.statics.findVehiclesByShowroom = async function (showroom: string) {
      return this.find({ showroom }).sort({ dateAdded: -1 }).lean();
    };
  }

  if (!schema.statics.countStock) {
    schema.statics.countStock = async function (showroom: string) {
      const [inStock, outOfStock] = await Promise.all([
        this.countDocuments({ showroom, status: "Stock In" }),
        this.countDocuments({ showroom, status: "Stock Out" }),
      ]);
      return { inStock, outOfStock };
    };
  }

  return model as IVehicleModel<T>;
}

// Export typed vehicle models
export const VehicleModels = {
  Bike: withVehicleMethods(Bike),
  Car: withVehicleMethods(Car),
  Rickshaw: withVehicleMethods(Rickshaw),
  Loader: withVehicleMethods(Loader),
  "Electric Bike": withVehicleMethods(ElectricBike),
};

// Utility functions
export const VehicleUtils = {
  getAllModels() {
    return Object.values(VehicleModels);
  },

  getModelByType(type: keyof typeof VehicleModels) {
    return VehicleModels[type];
  },

  async getTotalStockCount(showroom?: string) {
    const filter = showroom ? { showroom } : {};
    const counts = await Promise.all(
      this.getAllModels().map((model) => model.countDocuments(filter))
    );
    return counts.reduce((sum, count) => sum + count, 0);
  },
};
