import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import store from '../store'

describe('App', () => {
  it('renders nav for a signed-in user', () => {
    store.state.user = 'alice'
    const wrapper = mount(App, {
      global: { plugins: [store], stubs: { RouterLink: { template: '<a><slot/></a>' }, RouterView: true } },
    })
    expect(wrapper.text()).toContain('Library')
    expect(wrapper.text()).toContain('alice')
  })
})
