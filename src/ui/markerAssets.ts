import type { ImageSourcePropType } from 'react-native';

export const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  blaze: require('../../assets/vehicles/blaze.png'),
  twister: require('../../assets/vehicles/twister.png'),
  cell: require('../../assets/vehicles/cell.png'),
  ion: require('../../assets/vehicles/ion.png'),
  flare: require('../../assets/vehicles/flare.png'),
  bolt: require('../../assets/vehicles/bolt.png'),
  volt: require('../../assets/vehicles/volt.png'),
  arc: require('../../assets/vehicles/arc.png'),
  ember: require('../../assets/vehicles/ember.png'),
  ice: require('../../assets/vehicles/ice.png'),
  glow: require('../../assets/vehicles/glow.png'),
  nova: require('../../assets/vehicles/nova.png'),
  lava: require('../../assets/vehicles/lava.png'),
  pour: require('../../assets/vehicles/pour.png'),
  acid: require('../../assets/vehicles/acid.png'),
  neon: require('../../assets/vehicles/neon.png'),
  pyro: require('../../assets/vehicles/pyro.png'),
  nimbus: require('../../assets/vehicles/nimbus.png'),
  spore: require('../../assets/vehicles/spore.png'),
  pulse: require('../../assets/vehicles/pulse.png'),
};

export const INTEL_IMAGES: Record<string, ImageSourcePropType> = {
  unit: require('../../assets/intel/unit.png'),
  collision: require('../../assets/intel/collision.png'),
  object: require('../../assets/intel/object.png'),
  construction: require('../../assets/intel/construction.png'),
  closure: require('../../assets/intel/closure.png'),
  weather: require('../../assets/intel/weather.png'),
  disabled: require('../../assets/intel/disabled.png'),
  pothole: require('../../assets/intel/pothole.png'),
};
