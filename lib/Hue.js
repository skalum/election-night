const axios = require('axios');
const https = require('https');

const sleepNow = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

class Hue {
  constructor(baseUrl, username) {
    this.axios = axios.create({
      baseURL: `${baseUrl}/${username}`,
    });
  }

  async getLights() {
    const response = await this.axios.get('/lights');

    return response.data;
  }

  async alert(color, group, times = 3) {
    const {
      data: {
        lights
      }
    } = await this.axios.get(`/groups/${group}`);

    const lightStates = {}

    for (const light of lights) {
      const {
        data: {
          state: lightState
        }
      } = await this.axios.get(`/lights/${light}`);

      lightStates[light] = lightState;
    }

    await this.axios.put(`/groups/${group}/action`, {
      bri: 254,
      hue: color,
      sat: 254,
    });

    for (let i = 0; i < times; i++) {
      await this.axios.put(`/groups/${group}/action`, {
        alert: "select"
      });
      await sleepNow(600);
    }

    const entries = Object.entries(lightStates);
    for (const [light, state] of entries) {
      await this.axios.put(`/lights/${light}/state`, state);
    }
  }
}

module.exports = Hue;