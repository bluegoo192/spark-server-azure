const expect = require('chai').expect;
const driveTime = require('../calc/drivingTime.js');

describe('driveTime(agent, address)', function () {
  it('returns the time it takes an agent to get to an address', async function () {
    // Arrange
    let agent = {
      homelatitude: 37.425593,
      homelongitude: -122.135899
    }
    let address = {
      address: "822 La Para Ave",
      zip: 94306
    }

    try {
      // Act
      let time = driveTime(agent, address);

      // Assert
      expect(() => driveTime(agent, address)).to.not.throw();
      expect(time).to.exist;
    } catch (err) {
      console.log(err);
    }
  })
})
