import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemorySizeEditor } from './memory-size-editor';

describe('MemorySizeEditor', () => {
  let component: MemorySizeEditor;
  let fixture: ComponentFixture<MemorySizeEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemorySizeEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemorySizeEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
