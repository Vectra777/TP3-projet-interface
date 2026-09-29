import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('renders nav', () => {
    const wrapper = mount(App, { global: { stubs: { RouterLink: { template: '<a><slot/></a>' }, RouterView: true } } })
    expect(wrapper.text()).toContain('Library')
  })
})
