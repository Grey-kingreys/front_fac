import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { HasRole } from './has-role';

@Component({
  standalone: true,
  imports: [HasRole],
  template: `<div *appHasRole="['admin']">test</div>`,
})
class TestHostComponent {}

describe('HasRole', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
